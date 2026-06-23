const { Schema, model } = require('mongoose');

const autoResponseSchema = new Schema({
    guildId: { type: String, required: true },
    trigger: { type: String, required: true },
    reply: { type: String, default: null }, // If set, it's an auto-responder
    react: { type: String, default: null }, // If set (emoji), it's an auto-react
    matchType: { type: String, default: 'exact' } // exact, includes
});

module.exports = model('AutoResponse', autoResponseSchema);
