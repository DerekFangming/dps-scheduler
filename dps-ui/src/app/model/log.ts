export class Log {
  date: Date
  error: boolean
  message: string

  constructor(message: string, error: boolean = false) {
    this.date = new Date()
    this.error = error
    this.message = message
  }
}