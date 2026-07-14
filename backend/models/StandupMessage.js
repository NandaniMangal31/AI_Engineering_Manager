import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
  {
    slackFileId: {
      type: String,
      required: true,
    },

    fileName: {
      type: String,
      required: true,
    },

    title: {
      type: String,
      default: null,
    },

    mimeType: {
      type: String,
      default: null,
    },

    fileType: {
      type: String,
      default: null,
    },

    size: {
      type: Number,
      default: null,
    },

    urlPrivate: {
      type: String,
      default: null,
    },

    urlPrivateDownload: {
      type: String,
      default: null,
    },

    permalink: {
      type: String,
      default: null,
    },

    createdAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const standupMessageSchema = new mongoose.Schema({
  standupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Standup',
    required: true,
  },

  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true,
  },

  rawMessage: {
    type: String,
    default: '',
  },

  parsed: {
    type: Boolean,
    required: true,
    default: false,
  },

  attachments: {
    type: [attachmentSchema],
    default: [],
  },
});

export default mongoose.model(
  'StandupMessage',
  standupMessageSchema
);