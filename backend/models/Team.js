const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },

    slackChannelId: {
        type: String,
        unique: true,
        sparse: true,
    },

    slackChannelName: {
        type: String,
    },

    isSlackConnected: {
        type: Boolean,
        default: false,
    }
});
module.exports = mongoose.model('Team', teamSchema);