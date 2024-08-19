const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const { logger, readLog } = require("./utils/logging/index.js");

// Define the path to the JavaScript file
const pricesFilePath = path.join(__dirname, './functions/data/prices.js');
const debtLimitFilePath = path.join(__dirname, './debt_limit.js');

// GET prices
router.get('/prices', (req, res) => {
    try {
        // Read the file dynamically
        const data = fs.readFileSync(pricesFilePath, 'utf8');
        
        // Use a more flexible regex to extract the JSON part from the file content
        const match = data.match(/module\.exports\s*=\s*({[\s\S]*})/);
        
        if (match) {
            const jsonString = match[1];
            // Use a try-catch block for JSON parsing
            try {
                const prices = JSON.parse(jsonString);
                res.json(prices);
            } catch (parseError) {
                logger.info('Failed to parse prices data: ' + parseError.message);
                res.status(500).json({ message: 'Failed to parse prices data' });
            }
        } else {
            logger.info('Failed to extract prices data from file');
            res.status(500).json({ message: 'Failed to extract prices data from file' });
        }
    } catch (err) {
        logger.info('Error reading prices file: ' + err.message);
        res.status(500).json({ message: 'Error reading prices file' });
    }
});

// PUT prices
router.put('/prices', (req, res) => {
    try {
        const prices = req.body;
        
        if (!prices || typeof prices !== 'object') {
            return res.status(400).json({ message: 'Invalid data format' });
        }
    
        // Format the data as a CommonJS module export
        const dataToWrite = `module.exports = ${JSON.stringify(prices, null, 4)};`;
    
        fs.writeFile(pricesFilePath, dataToWrite, 'utf8', (err) => {
            if (err) {
                return res.status(500).json({ message: 'Error writing prices file' });
            }
            res.status(200).json({ message: 'Prices updated!' });
        });
    } catch (err) {
        logger.info(err);
    }
});

// GET debt limit
router.get('/debt-limit', (req, res) => {
    try {
        // Read the file dynamically
        const data = fs.readFileSync(debtLimitFilePath, 'utf8');
        
        // Use regex to extract the debt limit value
        const match = data.match(/module\.exports\s*=\s*(\d+)/);
        
        if (match) {
            const debtLimit = parseInt(match[1], 10);
            res.json({ debtLimit });
        } else {
            logger.info('Failed to extract debt limit from file');
            res.status(500).json({ message: 'Failed to extract debt limit from file' });
        }
    } catch (err) {
        logger.info('Error reading debt limit file: ' + err.message);
        res.status(500).json({ message: 'Error reading debt limit file' });
    }
});

// PUT debt limit
router.put('/debt-limit', (req, res) => {
    try {
        const { debtLimit } = req.body;
        
        if (typeof debtLimit !== 'number' || isNaN(debtLimit)) {
            return res.status(400).json({ message: 'Invalid debt limit format' });
        }
    
        // Format the data as a CommonJS module export
        const dataToWrite = `module.exports = ${debtLimit};`;
    
        fs.writeFile(debtLimitFilePath, dataToWrite, 'utf8', (err) => {
            if (err) {
                logger.info('Error writing debt limit file: ' + err.message);
                return res.status(500).json({ message: 'Error writing debt limit file' });
            }
            res.status(200).json({ message: 'Debt limit updated!', debtLimit });
        });
    } catch (err) {
        logger.info('Error updating debt limit: ' + err.message);
        res.status(500).json({ message: 'Error updating debt limit' });
    }
});

// Login route
router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;
    
        // Check if both fields are provided
        if (!username || !password) {
                logger.info('Username and password are required.')
            return res.status(400).json({ message: 'Username and password are required.' });
        }

        // Read and parse the user data
        const userData = require('./users.js');

        // Check if the username exists and the password matches
        if (userData[username] && userData[username] === password) {
            return res.status(200).json({ login: username, message: 'Login successful!' });
        } else {
            logger.info('Invalid username or password.')
            return res.status(401).json({ message: 'Invalid username or password.' });
        }

    } catch (err) {
        logger.info(err)
        return res.status(500).json({ message: 'Error reading user data.' });
    }
});

module.exports = router;
