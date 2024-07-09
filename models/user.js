const { Schema, model } = require('mongoose');

const UserModelSchema = new Schema({
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true }, 
    avatarUrl: { type: String, default: '' }, 
    verified: { type: Boolean, default: false },
    username: { type: String, unique: true, required: true },
    role: { type: String, default: "user" },
});

module.exports = model('User', UserModelSchema); 
