import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import path from 'path'
import axios from "axios"

import { locationResponse, locationDateResponse } from './constant.js'

const port = '9003'
const app = express()
app.use(bodyParser.json({limit: '100mb'}), cors())
const __dirname = path.resolve()

const header = {headers: { Authorization: `Bearer ${process.env.SMARTTHINGS_PAT}`}}

const http = axios.create({
  baseURL: 'https://publicapi.txdpsscheduler.com',
  timeout: 30000,
  headers: {
    // Content-Type': 'application/json;charset=UTF-8',
    Origin: 'https://public.txdpsscheduler.com',
    Referer: 'https://public.txdpsscheduler.com/',
  }
})

app.post('/api', async (req, res) => {
  //req.body.code
  res.status(200).json({})
})

app.get('/test', async (req, res) => {

  // http.
  res.status(200).json({})
})

app.get('/api/available-locations', async (req, res) => {

  if (!req.query.zipcode || !req.query.type) {
    return res.status(400).json({message: 'Invalid zipcode or type'})
  }

  // try {
  //   let response = await http.post('api/AvailableLocation', {
  //     CityName: "",
  //     PreferredDay: 0,
  //     TypeId: req.query.type,
  //     ZipCode: req.query.zipcode
  //   })
  //   res.status(200).json(response.data)
  // } catch (e) {
  //   res.status(500).json({message: e.message})
  // }

  res.status(200).json(locationResponse())
})

app.get('/api/available-location-dates', async (req, res) => {

  if (!req.query.locations || !req.query.type) {
    return res.status(400).json({message: 'Invalid locations or type'})
  }

  let requests = []
  for (let location of req.query.locations.split(',')) {
    requests.push(http.post('api/AvailableLocationDates', {
      LocationId: location,
      SameDay: false,
      PreferredDay: 0,
      TypeId: req.query.type
    }))
  }

  // try {
  //   let responses = await Promise.all(requests)

  //   let out = {}
  //   for (let response of responses) {
  //     out[response.data.LocationId] = response.data
  //   }

  //   res.status(200).json(out)
  // } catch (e) {
  //   res.status(500).json({message: e.message})
  // }

  res.status(200).json(locationDateResponse())
})

app.use(express.static(path.join(__dirname, 'public')))

app.listen(port, () => {
  console.log(`DPS app listening on port ${port}`)
})
