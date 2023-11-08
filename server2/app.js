const express = require('express');
const mysql = require('mysql');
const path = require('path');
const app = express();
require('dotenv').config();
let requestCount = 0;
const PORT = 3000;

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,  
});

db.connect((err) => {
    if (err) {
        console.error('error connecting to the databse: ' + err);
    } else {
        console.log('Connected to database');
    }
})

app.use(function(req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    next(); // make sure we go to the next routes and don't stop here
})

function missingParameterList(parsedQuery) {
    let missingObjects = [];
    for(const key in parsedQuery) {
        if(!(parsedQuery[key].trim())) {
            missingObjects.push(key);
        }
        return missingObjects;
    }
}

app.post('/labs/lab62/api/v1/definition', (req, res) => {
    requestCount ++;
    let body = '';
    req.on('data', (chunk) => {
        body += chunk.toString();
    })

    req.on('end', () => {
        const parsedQuery = JSON.parse(body);
        missingList = missingParameterList(parsedQuery);

        if(missingList.length > 0) {
            let missingParameterString = 'Entry missing {';
            res.status(400).json({
                success: false,
                message: missingParameterList + missingList.join(', ' + ' }'),
                error: 'Bad Request',
                entry: parsedQuery,
                entry: parsedQuery,
                requestCount: requestCount
            })
        } else {
            const SQL_INSERT_WORD = 'INSERT INTO dictionary (word, definition, wordLanguage, definitionLanguage) VALUES (?, ?, ?, ?)';
            const values = [parsedQuery.word, parsedQuery.definition, parsedQuery.wordLanguage, parsedQuery.definitionLanguage];

            db.query(SQL_INSERT_WORD, values, (err, result) => {
                if (err) {
                    res.status(409).json({
                        success: false,
                        error: 'Word conflict',
                        message: 'The word ${parsedQuery.word} already exists in the dictionary',
                        entry: parsedQuery,
                        requestCount: requestCount
                    })               
                } else {
                    res.status(201).json({
                        success: true,
                        message: 'Entry created successfully!',
                        entry: parsedQuery,
                        requestCount: requestCount
                    })
                }
            })
        }
    })
});

app.patch('/labs/lab62/api/v1/definition/:word', (req, res) => {
    requestCount ++;
    const wordToUpdate = req.params.word;

    let body = '';
    req.on('data', (chunk) => {
        body += chunk.toString();
    })
    req.on('end', () => {
        const parsedQuery = JSON.parse(body);
        const { definition, wordLanguage, definitionLanguage } = parsedQuery; // destructuring
        const missingList = missingParameterList(parsedQuery);

        if(missingList.length > 0) {
            let missingParameterString = 'Entry missing {';
            res.status(400).json({
                success: false,
                message: missingParameterList + missingList.join(', ' + ' }'),
                error: 'Bad Request', 
                entry: parsedQuery,
                requestCount: requestCount
            })
        }

        const SQL_UPDATE_WORD = 'UPDATE dictionary SET definition = ?, wordLanguage = ?, definitionLanguage = ? WHERE word = ?';
        const values = [definition, wordLanguage, definitionLanguage, wordToUpdate];

        db.query(SQL_UPDATE_WORD, values, (err, result) => {
            if(err) {
                console.log("Database error: " + err);
                res.status(500).json({
                    success: false,
                    message: "Entry update failed",
                    error: "Internal Server Error",
                    entry: parsedQuery,
                    requestCount:  requestCount
                })
            } else {
                if (result.affectedRows === 0) {
                    res.status(404).json({ 
                        success: false,
                        message: "Word not found",
                        entry: parsedQuery,
                        requestCount: requestCount
                    });
                } else {
                    res.status(200).json({
                        success: true,
                        message: "Word updated successfully",
                        entry: parsedQuery,
                        requestCount: requestCount
                    })
                }
            }
        })
    })
});

app.delete('/labs/lab62/api/v1/definition/:word', (req, res) => {
    requestCount++;
    const wordToDelete = req.params.word;

    const SQL_DELETE_WORD = 'DELETE FROM dictionary WHERE word = ?';
    db.query(SQL_DELETE_WORD, wordToDelete, (err, result) => {
        if (err) {
            res.status(500).json({
                success: false,
                message: 'Entry deletion failed',
                error: 'Internal Server Error',
                entry: wordToDelete,
                requestCount: requestCount
            })
        } else {
            if(result.affectedRows === 0) {
                res.status(404).json({
                    success: false,
                    message: `Word ${wordToDelete} not found`,
                    entry: wordToDelete,
                    requestCount: requestCount
                })
            } else {
                res.status(200).json({
                    success: true,
                    message: `Word ${wordToDelete} deleted successfully`,
                    entry: wordToDelete,
                    requestCount: requestCount
                })
            }
        }
    })
});

app.get('/labs/lab62/api/v1/definition/:word', (req, res) => {
    requestCount++;
    const wordToSearch = req.params.word;
    console.log("Word to search: ", wordToSearch);

    const SQL_GET_WORD = 'SELECT * FROM dictionary WHERE word = ? ORDER BY id DESC LIMIT 1';
    db.query(SQL_GET_WORD, wordToSearch, (err, result) => {
        if(err) {
            res.response(500).json({
                success: false,
                message: 'Entry retrieval failed',
                error: 'Internal Server Error',
                entry: wordToSearch,
                requestCount: requestCount
            })
        } else {
            if (result.length > 0) {
                res.status(200).json({
                    success: true,
                    message: `Word ${wordToSearch} retrieved successfully`,
                    result: result,
                    requestCount: requestCount
                })
            } else {
                res.status(404).json({
                    success: false,
                    message: `Word ${wordToSearch} not found`,
                    result: result,
                    requestCount: requestCount
                })
            }
        }
    })
});

app.get('/labs/lab62/api/v1/languages', (req, res) => {
    const SQL_SELECT_LANGUAGES = 'SELECT * FROM languages';

    db.query(SQL_SELECT_LANGUAGES, (err, result) => {
        if (err) {
            console.error('Error getting languages: ' + err);
            res.status(500).json({
                success: false,
                message: 'Error getting languages',
                error: 'Internal Server Error'
            })
        } else {
            res.status(200).json({
                success: true,
                message: 'Languages retrieved successfully',
                result: result
            })
        }
    })
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`)
})