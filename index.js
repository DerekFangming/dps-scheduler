import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import path from 'path'
import axios from "axios"

import { locationResponse } from './constant.js'

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

  let payload = {
    CityName: "",
    PreferredDay: 0,
    TypeId: req.query.type,
    ZipCode: req.query.zipcode
  }
  // let response = await http.post('api/AvailableLocation', payload) TODO
  // res.status(200).json(response.data)

  res.status(200).json(locationResponse())
})

app.get('/api/available-location-dates', async (req, res) => {

  if (!req.query.locations) {
    return res.status(400).json({message: 'Invalid locations'})
  }

  let locations = req.query.locations.split(',')
  console.log(locations)

  let payload = {
    CityName: "",
    PreferredDay: 0,
    TypeId: req.query.type,
    ZipCode: req.query.zipcode
  }
  // let response = await http.post('api/AvailableLocation', payload) TODO
  // res.status(200).json(response.data)

  res.status(200).json(locationResponse())
})


app.use(express.static(path.join(__dirname, 'public')))

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
