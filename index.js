import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import path from 'path'
import axios from 'axios'

import { locationResponse, locationDateResponse, bookingResponse } from './constant.js'

const port = '9005'
const app = express()
app.use(bodyParser.json({limit: '100mb'}), cors())
const __dirname = path.resolve()

const requestedWith = 'X-Requested-With'
const devMode = true

const http = axios.create({
  baseURL: 'https://publicapi.txdpsscheduler.com',
  timeout: 30000,
  headers: {
    Origin: 'https://public.txdpsscheduler.com',
    Referer: 'https://public.txdpsscheduler.com/',
  }
})

app.get('/api/available-locations', async (req, res) => {
  if (!req.query.zipcode || !req.query.type) {
    return res.status(400).json({message: 'Invalid zipcode or type'})
  }

  if (devMode) return res.status(200).json(locationResponse())

  try {
    let response = await http.post('api/AvailableLocation', {
      CityName: '',
      PreferredDay: 0,
      TypeId: req.query.type,
      ZipCode: req.query.zipcode
    })
    res.status(200).json(response.data)
  } catch (e) {
    res.status(500).json({message: e.message})
  }
})

app.get('/api/available-location-dates', async (req, res) => {
  if (!req.query.locations || !req.query.type) {
    return res.status(400).json({message: 'Invalid locations or type'})
  }

  if (devMode) return res.status(200).json(locationDateResponse())

  let requests = []
  for (let location of req.query.locations.split(',')) {
    requests.push(http.post('api/AvailableLocationDates', {
      LocationId: location,
      SameDay: false,
      PreferredDay: 0,
      TypeId: req.query.type
    }))
  }

  try {
    let responses = await Promise.all(requests)
    res.status(200).json(responses.map(r => r.data))
  } catch (e) {
    res.status(500).json({message: e.message})
  }
})

app.get('/api/bookings', async (req, res) => {
  if (!req.query.type || !req.header(requestedWith)) {
    return res.status(400).json({message: 'Invalid type or X-Requested-With header'})
  }

  if (devMode) return res.status(200).json([])

  try {
    let response = await http.post('/api/Booking', JSON.parse(req.header(requestedWith)))
    res.status(200).json(response.data.filter(b => b.ServiceTypeId == req.query.type))

  } catch (e) {
    res.status(500).json({message: e.message})
  }
})

app.delete('/api/bookings/:id', async (req, res) => {
  if (!req.params.id || !req.header(requestedWith)) {
    return res.status(400).json({message: 'Invalid ID or X-Requested-With header'})
  }

  if (devMode) return res.status(204).send()

  let payload = JSON.parse(req.header(requestedWith))
  payload.ConfirmationNumber = req.params.id

  try {
    await http.post('/api/CancelBooking', payload)
    res.status(204).send()
  } catch (e) {
    res.status(500).json({message: e.message})
  }
})

app.post('/api/bookings', async (req, res) => {
  if (!req.body.FirstName || !req.body.LastName || !req.body.DateOfBirth || !req.body.LastFourDigitsSsn || !req.body.Email
    || !req.body.hasOwnProperty('CellPhone') || !req.body.hasOwnProperty('SendSms') || !req.body.SlotId || !req.body.BookingDateTime
    || !req.body.BookingDuration || !req.body.LocationId || !req.body.ServiceTypeId ) {
    return res.status(400).json({message: 'Invalid FirstName or LastName or DateOfBirth or LastFourDigitsSsn ' +
    'or Email or CellPhone or SendSms or SlotId or BookingDateTime or BookingDuration or LocationId or ServiceTypeId'})
  }

  if (devMode) return res.status(200).send(bookingResponse())

  // Hold slot
  try {
    let response = await http.post('/api/HoldSlot', {
      FirstName: req.body.FirstName,
      LastName: req.body.LastName,
      DateOfBirth: req.body.DateOfBirth,
      Last4Ssn: req.body.LastFourDigitsSsn,
      SlotId: req.body.SlotId
    })

    if (!response.data.SlotHeldSuccessfully) {
      return res.status(500).json({message: 'Failed to hold slot: ' + response.data.ErrorMessage})
    }
  } catch (e) {
    return res.status(500).json({message: e.message})
  }

  // Get eligibility
  let eligibilityResponseId
  try {
    let response = await http.post('/api/Eligibility', {
      FirstName: req.body.FirstName,
      LastName: req.body.LastName,
      DateOfBirth: req.body.DateOfBirth,
      LastFourDigitsSsn: req.body.LastFourDigitsSsn,
      CardNumber: ''
    })

    if (response.data.length == 0) {
      return res.status(500).json({message: 'No eligibility'})
    }

    eligibilityResponseId = response.data[0].ResponseId
  } catch (e) {
    return res.status(500).json({message: e.message})
  }

  // Book slot
  try {
    let response = await http.post('/api/NewBooking', {
      AdaRequired: false,
      BookingDateTime: req.body.BookingDateTime,
      BookingDuration: req.body.BookingDuration,
      CardNumber: '',
      CellPhone: req.body.CellPhone,
      DateOfBirth: req.body.DateOfBirth,
      Email: req.body.Email,
      FirstName: req.body.FirstName,
      LastName: req.body.LastName,
      HomePhone: '',
      Last4Ssn: req.body.LastFourDigitsSsn,
      ResponseId: eligibilityResponseId,
      SendSms: req.body.SendSms,
      ServiceTypeId: req.body.ServiceTypeId,
      SiteId: req.body.LocationId,
      SpanishLanguage: 'N'
    })

    res.status(200).json(response.data)
  } catch (e) {
    res.status(500).json({message: e.message})
  }
})

app.use(express.static(path.join(__dirname, 'public')))

app.listen(port, () => {
  console.log(`DPS app listening on port ${port}`)
})
