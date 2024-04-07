# Travel Agency Web Application

This is a web application for a travel agency where users can register, login, book tours, and administrators can manage users, tours, airports, and hotels.

## Features

- User authentication: Users can register and login securely using bcrypt for password hashing and JWT for authentication.
- Internationalization (i18n): Supports multiple languages with dynamic language switching.
- Tour booking: Users can book tours, view their booked tours, and administrators can manage tour details.
- Administrator dashboard: Administrators have access to an admin dashboard where they can manage users, tours, and site content.
- Integration with external APIs: Provides integration with external APIs for retrieving airport and hotel information.

## Technologies Used

- Node.js
- Express.js
- MongoDB with Mongoose
- bcryptjs for password hashing
- JSON Web Tokens (JWT) for authentication
- Multer for handling file uploads
- Axios for making HTTP requests to external APIs

## Setup Instructions

1. Clone this repository
2. Install dependencies: \`npm install\`
3. Start the server: \`nodemon server.js\`
5. Access the application in your browser at \`http://localhost:3000\`

## Admin information

The admin is already registered, you should immediately log in to the account:

- username: Zangar
- email: Zangar@gmail.com
- password: Zangar2207

## API Endpoints

- \`POST /register\`: Register a new user.
- \`POST /login\`: Login with username and password.
- \`GET /index\`: View the homepage with featured tours.
- \`GET /tours\`: View all available tours.
- \`GET /tours/:tourId\`: View details of a specific tour.
- \`GET /mytours\`: View tours booked by the logged-in user.
- \`GET /admin\`: View the admin dashboard.
- \`POST /admin/add\`: Add a new user (admin only).
- \`POST /admin/update\`: Update user details (admin only).
- \`POST /admin/delete\`: Delete a user (admin only).
- \`GET /admin/tours\`: View all tours in the admin dashboard.
- \`POST /admin/tours\`: Add a new tour (admin only).
- \`POST /admin/tours/update\`: Update tour details (admin only).
- \`POST /admin/tours/delete\`: Delete a tour (admin only).
- \`GET /airports\`: View airport information.
- \`POST /airports\`: Search for airports by city.
- \`GET /hotels\`: View hotel information.
- \`POST /hotels\`: Search for hotels.

## API Key 
- https://api-ninjas.com/api - "RylEwR0tvdoj1xbuI+2l9g==e99UWkaA9lxnXkCo"
- https://newsapi.org/v2/top-headlines - "6dcf985c19dc4b84ac1de09160364a42"