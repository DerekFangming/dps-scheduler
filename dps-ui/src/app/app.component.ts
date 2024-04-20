import { HttpClient } from '@angular/common/http'
import { Component, Input, model, signal } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { environment } from '../environments/environment'
import { FormsModule } from '@angular/forms'
import { CommonModule } from '@angular/common'
import { AvailableLocation } from './model/available-location'

declare var $: any

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {

  state = 'location'
  loading = false

  popupTitle = ''
  popupDescription = ''

  // apptType = 0 TODO
  // zipCode = signal('')
  apptType = 71
  zipCode = signal('78754')
  selectAll = signal(false)

  availableLocations: AvailableLocation[] = []

  constructor(private http: HttpClient) {
  }

  setType(type: number) {
    this.apptType = type
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
    }}).subscribe(cb => {
      this.loading = false
      for (let l of cb) {
        l.selected = signal(false)
      }
      this.availableLocations = cb
    })

  }

  selectAllLocations() {
    this.selectAll.update(v => !v)
    for (let l of this.availableLocations) {
      l.selected.update(() => this.selectAll())
    }
  }

  selectLocation(l: AvailableLocation) {
    l.selected.update(c => !c)
  }

  selectDate() {
    let selected = false
    for (let l of this.availableLocations) {
      if (l.selected()) selected = true
    }

    if (!selected) {
      return this.showError('At least one location needs to be selected')
    }
  }

  showError(message: string) {
    this.popupTitle = 'Error'
    this.popupDescription = message
    $("#infoModal").modal('show')
  }
}
