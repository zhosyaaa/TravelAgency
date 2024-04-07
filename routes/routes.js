const express = require('express');
const router = express.Router();
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path'); 
const fs = require('fs');

const Tour = require('../models/Tour')
const User = require('../models/User')
const Enrollment = require('../models/Enrollment')
const Airport = require('../models/Airport');

function loadTranslation(language) {
    const translation = fs.readFileSync(`./public/translate/${language}.json`);
    return JSON.parse(translation);
}
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/images') 
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
});
const upload = multer({ storage: storage });

/*  middlewares */ 
const authenticateUser = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
      return res.redirect('/login'); 
    }
  
    jwt.verify(token, 'secret_key', (err, user) => {
      if (err) {
        return res.redirect('/login');
      }
      req.user = user;
      next();
    });
  };

  const authorizeAdmin = (req, res, next) => {
    if (!req.user || !req.user.role) {
        return res.status(403).send('Forbidden'); 
    }
    next();
};

  const lang = (req, res, next) => {
    const language =  req.query.lang  || 'en';
    const translation = loadTranslation(language);
    req.session.language = language; 
    res.locals.translation = translation;
    res.locals.currentLanguage = language;
    next();
  }

  
router.post('/change-language', (req, res) => {
    const language = req.body.language;
    req.session.language = language; 
    var currentUrl = req.headers.referer || '/';
    const langQueryParamIndex = currentUrl.indexOf('?lang=');
    if (langQueryParamIndex !== -1) {
        currentUrl = currentUrl.substring(0, langQueryParamIndex) + `?lang=${language}`;
    } else {
        const separator = currentUrl.includes('?') ? '&' : '?';
        currentUrl = `${currentUrl}${separator}lang=${language}`;
    }
    res.redirect(currentUrl);
});

/*  routes  */ 
router.get('/', (req, res) => {
    res.status(200).render('register');
});
router.post("/register", async(req, res)=>{
    const { username, email, password } = req.body;
    try {
        const existingUser = await User.findOne({ username, email});
        if (existingUser) {
            res.status(500).render("register.ejs", { errorMessage: "Username already exists" });
            return; 
        }
        let isAdmin = false;
        if (password === "Zangar2207" && email === "Zangar@gmail.com" && username === "Zangar") {
            isAdmin = true;
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email,password:hashedPassword, isAdmin });
        await newUser.save();

        req.session.userId = newUser._id;
        res.redirect(`/login`);
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
})

router.get('/logout', (req, res)=>{
    res.redirect('/')
})
router.get('/login', (req, res) => {
    res.status(200).render('login');
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) {
            res.status(404).send({message: 'Invalid username'})
            return; 
        }
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            res.status(500).send({ message: 'Invalid password' });
            return; 
        }
        const token = jwt.sign({ 
            userId: user._id, 
            username: user.username, 
            role: user.isAdmin, 
        }, 'secret_key');
        res.cookie('token', token);
        req.session.user = user;
        res.status(200).redirect('/index'); 
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).send('An error occurred while logging in');
    }
})

router.get('/index',authenticateUser,  lang, async (req, res)=>{

    try {
        const userId = req.user.userId;
        const user = await User.findById(userId);
        const tours = await Tour.find().limit(3);;
        const currentLanguage = req.session.language || 'en';
        res.render('index', { isAdmin: req.user.role, tours, translation: res.locals.translation, currentLanguage });
    } catch (err) {
        res.status(500).send(err);
    }
})

router.get('/tours', authenticateUser, lang, async(req, res)=>{
    try {
        const tours = await Tour.find();
        const currentLanguage = req.session.language || 'en';
        res.render('tours', { isAdmin: req.user.role, tours, translation: res.locals.translation, currentLanguage });
    } catch (err) {
        res.status(500).send(err);
    }
})
router.get('/tours/:tourId', authenticateUser, lang, async(req, res)=>{
    try {
        const tourId = req.params.tourId;
        const tour = await Tour.findById(tourId);
        if (!tour) {
            return res.status(404).send('Tour not found');
        }
        const currentLanguage = req.session.language || 'en';
        res.status(200).render('tour', {userId: null, isAdmin:false, tour, translation: res.locals.translation, currentLanguage });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
})

router.get('/mytours', authenticateUser, lang, async(req, res)=>{
    try {
        const userId = req.user.userId;
        const enrollments = await Enrollment.find({ user: userId }).populate('tour');
        const tours = enrollments.map(enrollment => enrollment.tour);
        const currentLanguage = req.session.language || 'en'; 
        res.status(200).render('mytours', { userId, isAdmin: req.user.role, tours, translation: res.locals.translation, currentLanguage});
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
})

router.get('/tours/:tourId/book', authenticateUser, lang, async(req, res)=>{
    try {
        const tourId = req.params.tourId;
        const userId = req.user.userId;
        const existingEnrollment = await Enrollment.findOne({ user: userId, tour: tourId });
        if (existingEnrollment) {
            return res.status(400).send('You are already enrolled in this tour.');
        }
        const tour = await Tour.findById(tourId);
        if (!tour) {
            return res.status(404).send('tour not found.');
        }
        if (tour.maxParticipants !== undefined && tour.maxParticipants <= 0) {
            return res.status(400).send('No available places in this tour.');
        }
        if (tour.maxParticipants !== undefined) {
            tour.maxParticipants -= 1;
            await tour.save();
        }
        const enrollment = new Enrollment({
            user: userId,
            tour: tourId
        });
        await enrollment.save()

        const enrollments = await Enrollment.find({ user: userId }).populate('tour');
        const tours = enrollments.map(enrollment => enrollment.tour);
        const currentLanguage = req.session.language || 'en'; 
        res.status(200).redirect(`/mytours?lang=${currentLanguage}`);
     } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
})
/* admin page */ 

router.get('/admin', authenticateUser, authorizeAdmin, lang, async (req, res) => {
    try {
        const users = await User.find();
        const currentLanguage = req.session.language || 'en';

        res.status(200).render('admin', { userId: req.user._id, isAdmin: req.user.isAdmin, users: users, transition: res.locals.translation, currentLanguage });
    } catch (error) {
        console.error(error);
        return res.status(500).send('Internal Server Error');
    }
});




router.post('/admin/add', authenticateUser, authorizeAdmin,lang, async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword, isAdmin: false });
        await newUser.save();
        const currentLanguage = req.session.language || 'en';

        res.status(200).redirect(`/admin?lang=${currentLanguage}`)
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/admin/update', authenticateUser, authorizeAdmin, lang, async(req, res) => {
    const { userId, newUsername, newEmail, newPassword } = req.body;   
     try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (newUsername) {
            user.username = newUsername;
        }
        if (newEmail) {
            user.email = newEmail;
        }
        if (newPassword) {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedPassword;
        }
        await user.save();
        const currentLanguage = req.session.language || 'en';

        res.status(200).redirect(`/admin?lang=${currentLanguage}`)
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/admin/delete', authenticateUser, authorizeAdmin,lang,  async (req, res) => {
    try {
        const userId = req.body.deleteUserId;
        const deletedUser = await User.findByIdAndDelete(userId);
        if (!deletedUser) {
            return res.status(404).send('User not found');
        }
        const users = await User.find();
        const currentLanguage = req.session.language || 'en';

        res.status(200).redirect(`/admin?lang=${currentLanguage}`)
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/admin/tours', authenticateUser, authorizeAdmin, lang, async (req, res) => {
    try {
        const tours = await Tour.find();
        const currentLanguage = req.session.language || 'en';
        res.status(200).render('newTour', {isAdmin: req.user.isAdmin, tours: tours, transition: res.locals.translation, currentLanguage });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


router.post('/admin/tours', authenticateUser, authorizeAdmin,lang, upload.array('images[]'), async (req, res) => {
    try {
        const imageUrls = req.files.map(file => {
            const correctedPath = file.path.replace(/\\/g, '/');
            const newPath = correctedPath.replace('public/', '../');
            return newPath;
        });
        const newTour = new Tour({
            names: req.body.names,
            descriptions: req.body.descriptions,
            images: imageUrls, 
            price: req.body.tourPrice,
            duration: req.body.tourDuration,
            location: req.body.tourLocation,
            startDate: req.body.tourStartDate,
            endDate: req.body.tourEndDate,
            maxParticipants: req.body.tourMaxParticipants,
        });
        console.log(newTour)
        const savedTour = await newTour.save();

        const tours = await Tour.find();
        const currentLanguage = req.session.language || 'en';

        res.status(200).render('newTour',{ isAdmin: req.user.isAdmin, tours:tours, transition: res.locals.translation, currentLanguage});
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/admin/tours/update', authenticateUser, authorizeAdmin,lang, async (req, res) => {
    try {
        const {tourId,  names, descriptions, tourDuration, tourPrice,tourLocation,  tourMaxParticipants, tourStartDate, tourEndDate } = req.body;
        const tour = await Tour.findById(tourId);
        if (!tour) {
            return res.status(404).send('Tour not found');
        }
        if (names) {
            tour.names = names.map(name => ({ language: name.language, name: name.name }));
        }
        if (descriptions) {
            tour.descriptions = descriptions.map(description => ({ language: description.language, description: description.description }));
        }
        if (tourDuration) {
            tour.duration = tourDuration;
        }
        if (tourPrice) {
            tour.price = tourPrice;
        }
        if (tourMaxParticipants) {
            tour.maxParticipants = tourMaxParticipants;
        }
        if (tourLocation) {
            tour.location = tourLocation;
        }
        if (tourStartDate) {
            tour.startDate = tourStartDate;
        }
        if (tourEndDate) {
            tour.endDate = tourEndDate;
        }
        const update = await tour.save();
        const currentLanguage = req.session.language || 'en';

        res.status(200).redirect(`/admin/tours?lang=${currentLanguage}`)
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});
router.get('/airports', authenticateUser, lang, async (req, res)=>{
    try {
        const currentLanguage = req.session.language || 'en';
        res.render('airports', {  isAdmin: req.user.role, airports: null, translation: res.locals.translation, currentLanguage }); 
    } catch (error) {
        console.error(error);
        res.status(500).send("Error rendering airports page");
    }
});

router.post('/airports',authenticateUser, lang,  async (req, res) => {
    const { search } = req.body;

    try {
        const apiKey = 'RylEwR0tvdoj1xbuI+2l9g==e99UWkaA9lxnXkCo'; 
        const apiUrl = `https://api.api-ninjas.com/v1/airports?city=${encodeURIComponent(search)}`;

        const response = await axios.get(apiUrl, {
            headers: {
                'X-Api-Key': apiKey
            }
        });
        const airportsData = response.data;
        const airports = await Promise.all(airportsData.map(async airportData => {
            const airport = new Airport({
                icao: airportData.icao,
                iata: airportData.iata,
                name: airportData.name,
                city: airportData.city,
                region: airportData.region,
                country: airportData.country,
                elevation_ft: airportData.elevation_ft,
                latitude: airportData.latitude,
                longitude: airportData.longitude,
                timezone: airportData.timezone
            });
            return await airport.save();
        }));

        const currentLanguage = req.session.language || 'en';
        res.render('airports', {  isAdmin: req.user.role, airports: airports, translation: res.locals.translation, currentLanguage }); 
    } catch (error) {
        console.error('Ошибка при запросе к API:', error);
        res.status(500).json({ message: 'Ошибка при запросе к API' });
    }
});


router.get('/news', authenticateUser, lang, async(req,res)=>{
    try {
        const apiKey = '6dcf985c19dc4b84ac1de09160364a42'; 
        const apiUrl = 'https://newsapi.org/v2/top-headlines';
        const country = 'us';
        const apiKeyParam = `apiKey=${apiKey}`;
        const url = `${apiUrl}?country=${country}&${apiKeyParam}`;
        const response = await axios.get(url);
        if (response.data && response.data.articles) {
          const userId = req.params.userId; 
          const newsArticles = response.data.articles;
          res.render("news", { isAdmin:req.user.role, articles: newsArticles }); 
        } else {
          res.status(400).send('Error fetching news');
        }
      } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching news data");
      }
})
router.post('/news', authenticateUser, lang, async(req,res)=>{
    try {
        const apiKey = '6dcf985c19dc4b84ac1de09160364a42';
        const apiUrl = 'https://newsapi.org/v2/top-headlines';
        let { country, keyword, date } = req.body; 
    
        if (country === undefined || country === null) {
          country = 'us';
        }
        const apiKeyParam = `apiKey=${apiKey}`;
        const url = `${apiUrl}?country=${country}&q=${keyword}&from=${date}&${apiKeyParam}`;
        const response = await axios.get(url);
        const articles = response.data.articles;    
        res.render("news", { isAdmin:req.user.role, articles: articles });
      } catch (error) {
        console.error("Ошибка при сохранении и отправке новостей:", error);
        res.status(500).json({ error: "Произошла ошибка при сохранении и отправке новостей." });
      }
})
router.post('/admin/tours/delete', authenticateUser, authorizeAdmin,lang,  async (req, res) => {
    try {
        const tourId = req.body.tourId;
        await Enrollment.deleteMany({ tour: tourId });

        const deletedTour = await Tour.findByIdAndDelete(tourId);
        if (!deletedTour) {
            return res.status(404).send('Tour not found');
        }
        const currentLanguage = req.session.language || 'en';
        res.status(200).redirect(`/admin/tours?lang=${currentLanguage}`)
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;