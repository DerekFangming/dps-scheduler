const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export class TimePreference {
  date!: Date

  allDay: boolean = false
  morning: boolean = false
  afternoon: boolean = false

  constructor(date: Date) {
    this.date = new Date(date)
  }

  getLabel() {
    return `${days[this.date.getDay()]}, ${months[this.date.getMonth()]} / ${this.date.getDate()}`
  }

  setAllDay() {
    this.morning = false
    this.afternoon = false
    this.allDay = !this.allDay
  }

  setMorning() {
    this.morning = !this.morning
    this.afternoon = false
    this.allDay = false
  }

  setAfternoon() {
    this.morning = false
    this.afternoon = !this.afternoon
    this.allDay = false
  }

  test(year:string, month:string, day:string, time:string) {
    if (Number(year) != this.date.getFullYear() || Number(month) != this.date.getMonth() + 1 || Number(day) != this.date.getDate()) {
      return false
    }

    if (this.allDay) {
      return true
    }

    if (this.morning && time.includes('AM')){
      return true
    }

    if (this.afternoon && time.includes('PM')){
      return true
    }

    return false
  }
}