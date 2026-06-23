const { Schema, model } = require('mongoose');

const userConfigSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    noPrefix: { type: Boolean, default: false }
});

module.exports = model('UserConfig', userConfigSchema);
