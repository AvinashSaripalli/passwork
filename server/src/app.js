const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { globalLimiter } = require('./utils/rateLimiters');

const authRoutes = require('./routes/authRoutes');
const vaultRoutes = require('./routes/vaultRoutes');
const passwordRoutes = require('./routes/passwordRoutes');
const activityRoutes = require('./routes/activityRoutes');
const userRoutes = require('./routes/userRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const folderRoutes = require('./routes/folderRoutes');
const invitationRoutes = require('./routes/invitationRoutes');
const personalVaultRoutes = require('./routes/personalVaultRoutes');
const passwordShareRoutes = require('./routes/passwordShareRoutes');
const loginActivityRoutes = require('./routes/loginActivityRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

app.disable('x-powered-by');

app.use(
  helmet({
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : ':method :url :status :response-time ms'));

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  })
);

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ message: 'API is running' });
});

app.use('/api', globalLimiter);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/vaults', vaultRoutes);
app.use('/api/v1/passwords', passwordRoutes);
app.use('/api/v1/activity', activityRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/folders', folderRoutes);
app.use('/api/v1/invitations', invitationRoutes);
app.use('/api/v1/my-vault', personalVaultRoutes);
app.use('/api/v1/password-shares', passwordShareRoutes);
app.use('/api/v1/login-activity', loginActivityRoutes);
app.use('/api/v1/notifications', notificationRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;
