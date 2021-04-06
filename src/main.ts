import express from 'express';
import cors from 'cors';

import auth from './routes/auth'
import home from './routes/home'
import workspace from './routes/workspace'
import channel from './routes/channel'
let app = express();



const options: cors.CorsOptions = {
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'X-Access-Token',
      'email',
      'tkn',
      'password',
      'workspace_id',
      'channel_id',
      'to_add',
      'user_email',
      'message_id'
    ],
    credentials: true,
    methods: 'GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE',
    origin: "*",
    preflightContinue: false,
};
app.use(cors(options));

app.use('/auth', auth);
app.use('/home', home);
app.use('/workspaces', workspace);
app.use('/channels', channel);

export { app }

app.listen(3000, () => console.log("Server started"))

