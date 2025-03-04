/* 
	the use of both access tokens and refresh tokens provides a balance between security, usability,
	and performance in authentication and authorization systems. Access tokens are used to access protected 
	resources, while refresh tokens are used to obtain new access tokens when needed, enhancing security and 
	user experience while minimizing performance impact.


	The path attribute in a cookie specifies the subset of URLs to which the cookie applies. By setting a specific path,
    you restrict the cookie to be sent only for requests made to URLs that match that path. enhancing overall security .

	 while users don't directly access URLs like /api/v1/auth/refreshtoken, these routes are essential for handling
	  authentication-related operations internally within the application. The specific path set for the refresh token 
	  cookie ensures that it is only sent for requests related to token refresh operations.
*/

import createHttpError from 'http-errors';
import { createUser, signUser } from '../services/auth.service.js';
import { generateToken, verifyToken } from '../services/token.service.js';
import { findUser } from '../services/user.service.js';

const accessTokenExpiration = '30d';
const refreshTokenExpiration = '1y';

export const register = async (req, res, next) => {
	try {
		const { name, email, picture,mobile, status, password } = req.body;
		const newUser = await createUser({ name, email,mobile, picture, status, password });

		const access_token = await generateToken(
			{ userId: newUser._id },
			accessTokenExpiration,
			process.env.ACCESS_TOKEN_SECRET
		);
		const refresh_token = await generateToken(
			{ userId: newUser._id },
			refreshTokenExpiration,
			process.env.REFRESH_TOKEN_SECRET
		);

		//---------send refresh token in cookies------------------------
		res.cookie('refreshToken', refresh_token, {
			httpOnly: false,
			domain: 'localhost',
			secure: false,
			path: '/', ///api/v1/auth/refreshtoken
			maxAge: 30 * 24 * 60 * 60 * 1000, //30 days
		});

		console.table({ access_token, refresh_token });

		//--------------send response-----------------------------

		res.json({
			message: 'register success.',
			user: {
				_id: newUser._id,
				name: newUser.name,
				email: newUser.email,
				picture: newUser.picture,
				status: newUser.status,
				token: access_token,
				mobile:newUser.mobile
			},
		});
	} catch (error) {
		next(error);
	}
};

export const login = async (req, res, next) => {
	try {
		const { email, password } = req.body;

		const user = await signUser(email, password);

		const access_token = await generateToken(
			{ userId: user._id },
			accessTokenExpiration,
			process.env.ACCESS_TOKEN_SECRET
		);
		const refresh_token = await generateToken(
			{ userId: user._id },
			refreshTokenExpiration,
			process.env.REFRESH_TOKEN_SECRET
		);

		//send refresh token in cookies
		res.cookie('refreshToken', refresh_token, {
			httpOnly: false,
			domain: 'localhost',
			secure: false,
			path: '/',
			maxAge: 30 * 24 * 60 * 60 * 1000, //30 days
		});

		res.json({
			message: 'login success.',
			user: {
				_id: user._id,
				name: user.name,
				email: user.email,
				picture: user.picture,
				status: user.status,
				token: access_token,
				mobile:user.mobile
			},
		});
	} catch (error) {
		next(error);
	}
};

export const logout = async (req, res, next) => {
	try {
		res.clearCookie('refreshtoken', { path: '/api/v1/auth/refreshtoken' });
		res.json({
			message: 'logged out successfully.',
		});
	} catch (error) {
		next(error);
	}
};

export const refreshToken = async (req, res, next) => {
	try {
		const refresh_token = req.cookies.refreshToken;

		if (!refresh_token) throw createHttpError.Unauthorized('please login');
		const check = await verifyToken(refresh_token, process.env.REFRESH_TOKEN_SECRET);

		const user = await findUser(check.userId);

		const access_token = await generateToken(
			{ userId: user._id },
			'1d',
			process.env.ACCESS_TOKEN_SECRET
		);

		res.json({
			message: 'token refreshed successfully.',
			user: {
				_id: user._id,
				name: user.name,
				email: user.email,
				picture: user.picture,
				status: user.status,
				token: access_token,
				mobile:user.mobile
			},
		});
	} catch (error) {
		next(error);
	}
};
