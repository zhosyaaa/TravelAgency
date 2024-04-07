const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    email :{
        type: String,
        require:true,
    },
    password: {
        type: String,
        required: true
    },
    creationDate: {
        type: Date,
        default: Date.now
    },
    updateDate: {
        type: Date,
        default: Date.now
    },
    deletionDate: {
        type: Date
    },
    isAdmin: {
        type: Boolean,
        default: false
    }
})

const User = mongoose.model('User', UserSchema);

module.exports = User;