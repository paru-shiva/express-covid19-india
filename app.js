const express = require('express')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const path = require('path')

const app = express()

app.use(express.json())

const dbPath = path.join(__dirname, 'covid19India.db')

let db = 'undefined'

const startServer = async () => {
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  })
}

startServer()

app.get('/', async (req, res) => {
  let resultFromDb = await db.all('select * from district')
  res.send(resultFromDb)
})

app.get('/states/', async (req, res) => {
  let resultFromDb = await db.all('select * from state')
  const changeFormat = obj => {
    return {
      stateId: obj.state_id,
      stateName: obj.state_name,
      population: obj.population,
    }
  }
  let op = resultFromDb.map(changeFormat)
  res.send(op)
})

app.get('/states/:stateId/', async (req, res) => {
  const {stateId} = req.params
  let result = await db.get(`select * from state where state_id = ${stateId}`)
  res.send({
    stateId: result.state_id,
    stateName: result.state_name,
    population: result.population,
  })
})

app.post('/districts/', async (req, res) => {
  let distId =
    (await db.get('select * from district order by district_id desc'))
      .district_id + 1
  try {
    await db.run(`insert into district values (${distId},
  '${req.body.districtName}',
  ${req.body.stateId},
  ${req.body.cases},
  ${req.body.cured},
  ${req.body.active},
  ${req.body.deaths})`)
    res.send('District Successfully Added')
  } catch (err) {
    console.log(err.message)
  }
})

app.get('/districts/:districtId/', async (req, res) => {
  let {districtId} = req.params
  let distDetails = await db.get(
    `select * from district where district_id = ${districtId}`,
  )
  res.send({
    districtId: distDetails.district_id,
    districtName: distDetails.district_name,
    stateId: distDetails.state_id,
    cases: distDetails.cases,
    cured: distDetails.cured,
    active: distDetails.active,
    deaths: distDetails.deaths,
  })
})

app.delete('/districts/:districtId/', async (req, res) => {
  let {districtId} = req.params
  await db.run(`delete from district where district_id = ${districtId}`)
  res.send('District Removed')
})

app.put('/districts/:districtId/', async (req, res) => {
  let {districtId} = req.params
  await db.run(`update district set district_id = ${districtId},
  district_name = '${req.body.districtName}',
  state_id = ${req.body.stateId},
  cases = ${req.body.cases},
  cured = ${req.body.cured},
  active = ${req.body.active},
  deaths = ${req.body.deaths} where district_id = ${districtId}
  `)
  res.send('District Details Updated')
})

app.get('/states/:stateId/stats/', async (req, res) => {
  let {stateId} = req.params
  let statsQuery = `select * from district where state_id = ${stateId}`
  let stats = await db.all(statsQuery)

  const reduceFunc = (obj1, obj2) => {
    return {
      cases: obj1.cases + obj2.cases,
      cured: obj1.cured + obj2.cured,
      active: obj1.active + obj2.active,
      deaths: obj1.deaths + obj2.deaths,
    }
  }

  stats = stats.reduce(reduceFunc)

  stats = {
    totalCases: stats.cases,
    totalCured: stats.cured,
    totalActive: stats.active,
    totalDeaths: stats.deaths,
  }

  res.send(stats)
})

app.get('/districts/:districtId/details/', async (req, res) => {
  const {districtId} = req.params
  const sqlQuery = `select * from district inner join state on district.state_id = state.state_id where district_id = ${districtId}`
  let op = await db.get(sqlQuery)
  res.send({
    stateName: op.state_name,
  })
})

app.listen(3000, () => {
  console.log('Server Started..')
})

module.exports = app
