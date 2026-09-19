// ============================================================
// Auth Routes — StackSave AI
// POST /api/auth/google, GET /api/auth/me, POST /api/auth/logout
// ============================================================

import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { UserModel, UserDocument, SubscriptionModel } from '../services/dbService';
import { isPremiumUser, syncUserEntitlement } from '../services/billingService';
import {
  generateSessionToken,
  setSessionCookie,
  clearSessionCookie,
} from '../utils/session';
import { authenticate } from '../middleware/auth';
import { sendWelcomeEmail } from '../services/emailService';

const router = Router();

export function toSafeUser(user: UserDocument) {
  return {
    id: user._id.toString(),
    googleId: user.googleId,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    plan: user.plan,
    subscriptionStatus: user.subscriptionStatus,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// ── POST /api/auth/google ────────────────────────────────────
// Verifies Google ID token (or OAuth2 access token), upserts user, and issues secure session
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { credential, accessToken } = req.body;
    if ((!credential || typeof credential !== 'string') && (!accessToken || typeof accessToken !== 'string')) {
      return res.status(400).json({
        success: false,
        error: 'Google credential or access token is required.',
      });
    }

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      console.error('❌ GOOGLE_CLIENT_ID environment variable is missing on backend.');
      return res.status(500).json({
        success: false,
        error: 'Server Google authentication is not configured.',
      });
    }

    let googleProfile: {
      sub: string;
      email: string;
      name?: string;
      picture?: string;
    };

    if (credential) {
      const client = new OAuth2Client(googleClientId);
      let ticket;
      try {
        ticket = await client.verifyIdToken({
          idToken: credential,
          audience: googleClientId,
        });
      } catch (verifyErr) {
        console.warn('Google token verification failed:', verifyErr);
        return res.status(401).json({
          success: false,
          error: "Google sign-in couldn't be completed. Please try again.",
        });
      }

      const payload = ticket.getPayload();
      if (!payload || !payload.sub || !payload.email) {
        return res.status(400).json({
          success: false,
          error: 'Incomplete Google token payload.',
        });
      }

      // Validate token issuer
      const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
      if (!validIssuers.includes(payload.iss)) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token issuer.',
        });
      }

      googleProfile = {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      };
    } else {
      // Fetch user profile from Google using OAuth2 access token
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!userInfoRes.ok) {
          throw new Error(`Google userinfo responded with status ${userInfoRes.status}`);
        }

        const data = (await userInfoRes.json()) as any;
        if (!data || !data.sub || !data.email) {
          return res.status(400).json({
            success: false,
            error: 'Incomplete user info returned from Google.',
          });
        }

        googleProfile = {
          sub: data.sub,
          email: data.email,
          name: data.name,
          picture: data.picture,
        };
      } catch (fetchErr) {
        console.warn('Failed to fetch user profile with access token:', fetchErr);
        return res.status(401).json({
          success: false,
          error: "Google sign-in couldn't be completed. Please try again.",
        });
      }
    }

    // Duplicate User Prevention (Section 28)
    // 1. Check if user with this googleId already exists
    let user = await UserModel.findOne({ googleId: googleProfile.sub });

    if (!user) {
      // 2. Check if a user exists with matching email
      user = await UserModel.findOne({ email: googleProfile.email.toLowerCase().trim() });
      if (user) {
        user.googleId = googleProfile.sub;
        if (googleProfile.name) user.name = googleProfile.name;
        if (googleProfile.picture) user.avatarUrl = googleProfile.picture;
        user.lastLoginAt = new Date();
        await user.save();
      } else {
        // 3. Create fresh user
        user = await UserModel.create({
          googleId: googleProfile.sub,
          email: googleProfile.email.toLowerCase().trim(),
          name: googleProfile.name || 'StackSave User',
          avatarUrl: googleProfile.picture,
          plan: 'FREE',
          subscriptionStatus: 'NONE',
          sessionVersion: 1,
          lastLoginAt: new Date(),
        });
      }
    } else {
      // Existing user: refresh profile info and last login
      if (googleProfile.name) user.name = googleProfile.name;
      if (googleProfile.picture) user.avatarUrl = googleProfile.picture;
      user.lastLoginAt = new Date();
      await user.save();
    }

    // Fire-and-forget Welcome Email on first login
    if (!user.welcomeEmailSentAt) {
      const userId = user._id;
      const userEmail = user.email;
      const userName = user.name;
      sendWelcomeEmail({ email: userEmail, name: userName })
        .then(async (result) => {
          if (result.success) {
            await UserModel.findByIdAndUpdate(userId, { welcomeEmailSentAt: new Date() });
          }
        })
        .catch((err) => {
          console.error('[Auth] Welcome email delivery failed:', err);
        });
    }

    // Generate signed JWT session and set HttpOnly cookie
    const sessionToken = generateSessionToken(user);
    setSessionCookie(res, sessionToken);

    return res.status(200).json({
      success: true,
      data: {
        user: toSafeUser(user),
      },
    });
  } catch (err) {
    console.error('POST /api/auth/google error:', err);
    return res.status(500).json({
      success: false,
      error: "Google sign-in couldn't be completed. Please try again.",
    });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────
// Returns current authenticated user from verified HttpOnly session
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    // If user is currently marked PREMIUM, check if their subscription has lapsed
    if (user.plan === 'PREMIUM') {
      const sub = await SubscriptionModel.findOne({ userId: user._id }).sort({ createdAt: -1 });
      if (sub && !isPremiumUser(user, sub)) {
        await syncUserEntitlement(user._id, sub);
        const refreshedUser = await UserModel.findById(user._id);
        if (refreshedUser) {
          req.user = refreshedUser;
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        user: toSafeUser(req.user!),
      },
    });
  } catch (err) {
    console.error('GET /api/auth/me error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve user profile.' });
  }
});

// ── POST /api/auth/logout ────────────────────────────────────
// Invalidates the current session by clearing the HttpOnly cookie
router.post('/logout', (_req: Request, res: Response) => {
  try {
    clearSessionCookie(res);
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (err) {
    console.error('POST /api/auth/logout error:', err);
    return res.status(500).json({ success: false, error: 'Failed to log out.' });
  }
});

export default router;
