import { HttpClient } from '@angular/common/http'
import { ChangeDetectorRef, Component, Injector, OnInit, afterNextRender, inject, signal } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { environment } from '../environments/environment'
import { FormsModule } from '@angular/forms'
import { CommonModule } from '@angular/common'
import { AvailableLocation } from './model/available-location'
import { TimePreference } from './model/time-preference'
import { Booking } from './model/booking'
import { Log } from './model/log'
import { firstValueFrom } from 'rxjs'
import { DomSanitizer } from '@angular/platform-browser'

declare var $: any

const requestedWith = 'X-Requested-With'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {

  state = 'location'
  loading = false
  started = false

  popupTitle = ''
  popupDescription = ''
  windowWidth = 1920

  apptType = 0
  zipCode = signal('')
  apptName = ''
  selectAll = signal(false)

  firstName = signal('')
  lastName = signal('')
  dob = signal('')
  ssn = signal('')
  email = signal('')
  phone = signal('')

  cancelExisting = signal(true)
  checkInterval = signal(60)

  availableLocations: AvailableLocation[] = []
  timePreferences: TimePreference[] = []
  logs: Log[] = []

  appointmentTypes = [
    {type: 71, name: 'Apply for first time Texas DL/Permit'},
    {type: 72, name: 'Apply for first time Texas ID'},
    {type: 74, name: 'Apply for Election Identification Certificate'},
    {type: 79, name: 'Add or Remove Restriction'},
    {type: 81, name: 'Change, replace or renew Texas DL/Permit'},
    {type: 82, name: 'Change, replace or renew Texas ID'},
    {type: 86, name: 'Driver License Address Change'},
    {type: 89, name: 'ID Address Change'},
    {type: 21, name: 'Drive Test Class C'},
    {type: 51, name: 'Drive Test RV'},
    {type: 121, name: 'Drive TestNon-CDL Class A/Class B'}
  ]

  constructor(private http: HttpClient, public sanitizer: DomSanitizer, private cdr: ChangeDetectorRef) {}

  injector = inject(Injector)
  ngOnInit() {
    this.addTimePreferences(10)
    afterNextRender(() => {
      this.windowWidth = window.screen.width
      this.cdr.detectChanges()
    }, {injector: this.injector})
  }

  setType(type: any) {
    this.apptType = type.type
    this.apptName = type.name
  }

  findLocations() {
    if (this.apptType == 0) {
      return this.showError('No appointment is selected')
    }

    if (!/^\d+$/.test(this.zipCode()) || this.zipCode().length != 5) {
      return this.showError('Zip code must be 5 digit number')
    }

    this.loading = true
    this.http.get<AvailableLocation[]>(environment.urlPrefix + 'api/available-locations', {params: {
      zipcode: this.zipCode(),
      type: this.apptType
    }}).subscribe({
      next: res => {
        this.loading = false
        res.map(r => r.selected = signal(false))
        this.availableLocations = res
      }, error: e => {
        this.loading = false
        this.showError(e.error.message)
      }
    })
  }

  selectAllLocations() {
    this.selectAll.update(v => !v)
    this.availableLocations.map(al => al.selected.update(() => this.selectAll()))
  }

  selectLocation(l: AvailableLocation) {
    l.selected.update(c => !c)
  }

  selectDate() {
    if (this.availableLocations.find(al => al.selected()) == null) {
      return this.showError('At least one location needs to be selected')
    }

    this.state = 'config'
  }

  addTimePreferences(totalDays: number) {
    let day = new Date()
    if (this.timePreferences.length != 0) {
      day = new Date(this.timePreferences[this.timePreferences.length - 1].date)
      day.setDate(day.getDate() + 1)
    }

    for (let i = 0; i < totalDays; i ++) {
      if (day.getDay() == 0) day.setDate(day.getDate() + 1)
      else if (day.getDay() == 6) day.setDate(day.getDate() + 2)

      this.timePreferences.push(new TimePreference(day))
      day.setDate(day.getDate() + 1)
    }
  }

  async start() {
    let timePreference = this.timePreferences.filter(t => t.allDay || t.afternoon || t.morning)
    if (timePreference.length == 0) {
      return this.showError('At least one preferred time slot needs to be selected')
    }
    if (this.firstName() == '') {
      return this.showError('Firstname cannot be empty')
    }
    if (this.lastName() == '') {
      return this.showError('LastName cannot be empty')
    }
    if (!/^((0?[1-9]|1[012])[- /.](0?[1-9]|[12][0-9]|3[01])[- /.](19|20)?[0-9]{2})*$/.test(this.dob())) {
      return this.showError('Date of birth format must be MM/DD/YYYY')
    }
    if (!/^\d{4}$/.test(this.ssn())) {
      return this.showError('Last four digit of ssn needs to be all numbers')
    }
    if (!/^\S+@\S+\.\S+$/.test(this.email())) {
      return this.showError('Invalid email format')
    }
    if (this.phone() != '' && !/^\d{10}$/.test(this.phone())) {
      return this.showError('Phone number needs to be all numbers only')
    }
    if (Number(this.checkInterval()) < 30) {
      return this.showError('Minimum cooldown is 30 seconds to avoid being banned')
    }

    this.logs = [new Log('Started')]
    this.started = true

    this.http.get<Booking[]>(environment.urlPrefix + 'api/bookings', {params: { type: this.apptType }, headers: {[requestedWith]: JSON.stringify({
      FirstName: this.firstName(),
      LastName: this.lastName(),
      DateOfBirth: this.dob(),
      LastFourDigitsSsn: this.ssn()
    })}}).subscribe({
      next: async res => {
        let existing:any = null
        if (res.length != 0) {
          existing = res[0]
          if (!this.cancelExisting()) {
            this.started = false
            return this.showError(`Existing booking found on ${existing.FormattedBookingDateMonth}/${existing.FormattedBookingDateDayYearTime} at ${existing.SiteName} but the scheduler is configured to not cancel existing appointment`)
          }
        }

        this.logs.push(new Log(existing == null ? 'No existing appointment found. Checking for available appointments.' :
        `Found existing appointment on ${existing.FormattedBookingDateMonth}/${existing.FormattedBookingDateDayYearTime} at ${existing.SiteName} that will be canceled once new one is found. Checking for available appointments.`))

        for (;;) {
          if (!this.started) break

          this.http.get<any[]>(environment.urlPrefix + 'api/available-location-dates', {params: {
            locations: this.availableLocations.filter(al => al.selected()).map(al => al.Id).join(','),
            type: this.apptType 
          }}).subscribe({
            next: async res =>  {
              if (res.length == 0) {
                this.logs.push(new Log('No available dates found.'))
                return
              }
      
              let earliest = new Date(res[0].FirstAvailableDate)
              let slotCount = 0
              let matchedSlot:any = null
              let matchedLocationId:any = null
              res.map(location => {
                if (matchedSlot != null) return
                let d = new Date(location.FirstAvailableDate)
                if (d < earliest) earliest = d
  
                location.LocationAvailabilityDates.map((date: any) => {
                  if (matchedSlot != null) return
                  date.AvailableTimeSlots.map((slot: any) => {
                    if (matchedSlot != null) return
                    slotCount ++
  
                    if (timePreference.find(t => t.test(slot.FormattedStartDateYear, slot.FormattedStartDateMonth, slot.FormattedStartDateDay, slot.FormattedTime)) != null) {
                      matchedSlot = slot
                      matchedLocationId = date.LocationId
                      this.logs.push(new Log(`Found matching slot on ${matchedSlot.FormattedStartDateTime}. Checking for existing appointments...`))
                      return
                    }
                  })
                })
              })
  
              if (matchedSlot == null) {
                this.logs.push(new Log(`Found ${slotCount} available appointments but none of them matches the preferred time slots. Earliest appointment is on ${earliest.toLocaleDateString()}`))
                return
              }

              // Cancel existing if found
              if (existing != null) {
                this.logs.push(new Log(`Canceling existing appointment on ${existing.FormattedBookingDateMonth}/${existing.FormattedBookingDateDayYearTime} at ${existing.SiteName}`))
                try {
                  await firstValueFrom(this.http.delete(environment.urlPrefix + 'api/bookings/' + existing.ConfirmationNumber, {headers: {[requestedWith]: JSON.stringify({
                    FirstName: this.firstName(),
                    LastName: this.lastName(),
                    DateOfBirth: this.dob(),
                    LastFourDigitsSsn: this.ssn()
                  })}}))
                } catch (e: any) {
                  this.logs.push(new Log(`Failed to cancel existing appointment: ${e.error.message}`, true))
                  return
                }
                this.logs.push(new Log(`Existing appointment canceled. Schedulding ...`))
              } else {
                this.logs.push(new Log(`No existing appointment found. Schedulding ...`))
              }

              try {
                let booking:any = await firstValueFrom(this.http.post(environment.urlPrefix + 'api/bookings', {
                  FirstName: this.firstName(),
                  LastName: this.lastName(),
                  DateOfBirth: this.dob(),
                  LastFourDigitsSsn: this.ssn(),
                  Email: this.email(),
                  CellPhone: this.phone(),
                  SendSms: this.phone() != '',
                  SlotId: matchedSlot.SlotId,
                  BookingDateTime: matchedSlot.StartDateTime,
                  BookingDuration: matchedSlot.Duration,
                  LocationId: matchedLocationId,
                  ServiceTypeId: `${this.apptType}`
                }))

                if (!booking.Booking) {
                  this.logs.push(new Log(`Failed to book appointment: ${booking.ErrorMessage}`, true))
                  return
                }

                this.started = false
                this.logs.push(new Log(`Appointment "${booking.Booking.ServiceType}" scheduled on ${booking.Booking.FormattedBookingDateMonth}/${booking.Booking.FormattedBookingDateDayYearTime} at ${booking.Booking.SiteName}`))

                this.popupTitle = 'Appointment Scheduled'
                this.popupDescription = `<b>Service Type: </b><span style='font-size:1rem'>${booking.Booking.ServiceType}</span><br />` +
                `<b>Time: </b><span style="font-size:1rem">${booking.Booking.FormattedBookingDateMonth}/${booking.Booking.FormattedBookingDateDayYearTime}</span><br />` +
                `<b>Location: </b><span style="font-size:1rem">${booking.Booking.SiteName}</span><br />` +
                `<b>Address</b>: <a href="${booking.Booking.MapUrl}" target="_blank"><span style="font-size:1rem">${booking.Booking.SiteAddress}</span></a>`
                $("#infoModal").modal('show')

              } catch (e: any) {
                this.logs.push(new Log(`Failed to book appointment: ${e.error.message}`, true))
                return
              }
      
            }, error: e => {
              this.logs.push(new Log(`Failed to load available dates: ${e.error.message}`, true))
            }
          })

          await new Promise(res => setTimeout(res, this.checkInterval() * 1000))
        }

      }, error: e => {
        this.started = false
        this.showError(e.error.message)
      }
    })

  }

  stop() {
    this.started = false
  }

  back() {
    this.state = 'location'
  }

  showError(message: string) {
    this.popupTitle = 'Error'
    this.popupDescription = message
    $("#infoModal").modal('show')
  }
}
