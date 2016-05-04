'use strict';

import mongoose, { Schema } from 'mongoose';

const PageSchema = new Schema({
  url: { type: String, unique: true },
  links: [{ type: String }],
  error: mongoose.Schema.Types.Mixed,
});

export default mongoose.model('Page', PageSchema);
