const mongoose = require('mongoose');

const airportSchema = new mongoose.Schema({
    icao: String,
    iata: String,
    name: String,
    city: String,
    region: String,
    country: String,
    elevation_ft: String,
    latitude: String,
    longitude: String,
    timezone: String
});

const Airport = mongoose.model('Airport', airportSchema);

module.exports = Airport;
