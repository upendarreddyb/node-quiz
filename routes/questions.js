var express = require('express');
var router = express.Router();
var con = require('../db.js');
const multer = require('multer');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // Set your destination folder
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
});



const upload = multer({ storage: storage });

router.post('/uploads', upload.fields([{ name: 'questionfiles' }, { name: 'answerfile' }]), (req, res) => {
    console.log("function called");
    console.log("Question Files:", req.files['questionfiles']); // Array of question files
    console.log("Answer Files:", req.files['answerfile']); // Array of answer files
    var questiontype = "";
    var answertype = "";
    if (req.body.question_type === 'Image') {
        const questionFileNames = req.files['questionfiles'].map(file => file.filename);
        const answerFileNames = req.files['answerfile'].map(file => file.filename);
        const questionFileString = questionFileNames.join(',');
        const answerFileString = answerFileNames.join(',');
        questiontype = questionFileString;
        answertype = answerFileString;
    } else if (req.body.question_type === 'Text') {
        questiontype = req.body.question;
        answertype = req.body.answer;
    }
    const insertQuery = `
    INSERT INTO quiz.questions (curriculum, subject, topic, paper, difficulty_level, season, zone, calculator, grade, question_type, question, answer,year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)`;
    const values = [
        req.body.curriculum,
        req.body.subject,
        req.body.topic,
        req.body.paper,
        req.body.dificulty,
        req.body.season,
        req.body.zone,
        req.body.calculater,
        req.body.grade,
        req.body.question_type,
        questiontype, // Comma-separated string of question file names
        answertype, // Comma-separated string of answer file names 
        req.body.year
    ];

    con.query(insertQuery, values, (error, results) => {
        if (error) {
            console.error('👎 Error inserting question into database:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        // Respond with success message or appropriate response
        res.status(200).json({ message: '👌Question inserted into database successfully' });
    });
});



router.post('/addfields', (req, res) => {
    const query = 'insert into  field_values (field_type_id,field) values (?,?)';
    con.query(query, [req.body.fieldetype, req.body.field], (err, result) => {
        if (err) {
            res.status(500).json({ error: '👎 Error In Inserting' });
        } else {
            res.json({ message: '👌 Added Successfully' });
        }
    });
});

router.get('/getfields', (req, res) => {
    selectQuery = `SELECT * FROM field_values`;
    con.query(selectQuery, (error, results) => {
        if (error) {
            console.error('Error fetching data:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        // Grouping fields by field_type_id with ids and fields as values
        const groupedFields = results.reduce((acc, curr) => {
            const { id, field_type_id, field } = curr;
            if (!acc[field_type_id]) {
                acc[field_type_id] = [];
            }
            acc[field_type_id].push({ id, field });
            return acc;
        }, {});

        res.json({ groupedFields });
    });
});


router.post('/mapfields', (req, res) => {
    const query = 'insert into map_fields (currculium,subject,topic) values (?,?,?)';
    con.query(query, [req.body.curriculum, req.body.subject, req.body.topic], (err, result) => {
        if (err) {
            res.status(500).json({ error: '👎 Error In Inserting ' });
        } else {
            res.json({ message: '👌 Mapped Successfully' });
        }
    });
});


router.post('/updatebranding', (req, res) => {
    const query = 'UPDATE branding SET header_text = ?, footer_text = ? WHERE id = ?';
    con.query(query, [req.body.headerText, req.body.footerText, 1], (err, result) => {
        if (err) {
            res.status(500).json({ error: '👎 Error In Updating ' });
        } else {
            res.json({ message: '👌 Updated Successfully' });
        }
    });
});

router.get('/getbranding', (req, res) => {
    const query = 'select * from branding';
    con.query(query, (err, result) => {
        if (err) {
            res.status(500).json({ error: 'Error in get Branding Details' });
        } else {
            res.json({ res: result });
        }

    })
})




router.get('/getfilters', (req, res) => {
    const query1 = `
    SELECT DISTINCT fv.id AS curriculum_id, fv.field AS currculium
    FROM field_values fv 
    INNER JOIN map_fields mf ON mf.currculium = fv.id;
    `;

    const query2 = `
    SELECT DISTINCT fv.id AS subject_id, mf.currculium AS curriculum_id, fv.field AS subject
    FROM field_values fv 
    INNER JOIN map_fields mf ON mf.subject = fv.id;
    `;

    const query3 = `
    SELECT DISTINCT fv.id AS topic_id, mf.subject AS subject_id, fv.field AS topic
    FROM field_values fv 
    INNER JOIN map_fields mf ON mf.topic = fv.id;
    `;

    // Execute the queries
    con.query(query1, (err1, results1) => {
        if (err1) {
            console.error('Error executing MySQL query 1: ' + err1.stack);
            res.status(500).send('Error retrieving curriculum data from database');
            return;
        }

        con.query(query2, (err2, results2) => {
            if (err2) {
                console.error('Error executing MySQL query 2: ' + err2.stack);
                res.status(500).send('Error retrieving subject data from database');
                return;
            }

            con.query(query3, (err3, results3) => {
                if (err3) {
                    console.error('Error executing MySQL query 3: ' + err3.stack);
                    res.status(500).send('Error retrieving topic data from database');
                    return;
                }

                // Format the results into an array of objects
                const formattedResults = [
                    { curriculums: results1 },
                    { subjects: results2 },
                    { topics: results3 }
                ];

                res.json(formattedResults);
            });
        });
    });
});

router.get('/getquestions', (req, res) => {
    const { page = 1, pageSize = req.query.limit } = req.query;
    const offset = (page - 1) * pageSize;
    var selectQuery = '';
    var queryCount = '';
    selectQuery = ` SELECT  q.id,q.curriculum AS curriculum_value,q.subject AS subject_value,q.topic AS topic_value,q.paper as paper,
                    q.difficulty_level, q.season, q.zone, q.calculator, q.grade, q.question_type, q.question, q.answer,q.year,
                    cv.field AS curriculum_field,sv.field AS subject_field,tv.field AS topic_field FROM questions q
                    JOIN field_values cv ON q.curriculum = cv.id 
                    JOIN field_values sv ON q.subject = sv.id
                    JOIN field_values tv ON q.topic = tv.id order by q.id ASC LIMIT ?, ?`

    queryCount = `SELECT COUNT(*) AS total_records
    FROM (
        SELECT  q.curriculum
        FROM questions q
        JOIN field_values cv ON q.curriculum = cv.id 
        JOIN field_values sv ON q.subject = sv.id
        JOIN field_values tv ON q.topic = tv.id
    ) AS subquery`;

    con.query(selectQuery, [offset, parseInt(pageSize)], (error, results) => {
        if (error) {
            console.error('Error fetching data:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        con.query(queryCount, (err, countResult) => {
            if (err) {
                console.error('Error getting total count:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            //const totalCount = countResult[0].totalCount;
            const totalCount = countResult[0].total_records;

            const totalPages = Math.ceil(totalCount / pageSize);
            res.json({ results, totalPages });
        });
    });
});

router.get('/getflterdquestions', (req, res) => {
    const { curriculum, subject, topic, paper, season, zone, page, limit, dificulty, calculater } = req.query;
    const pageSize = limit ? parseInt(limit) : 10; // Default page size is 10
    const offset = (page - 1) * pageSize;
    let selectQuery, queryCount, queryParams;
    console.log(req.query)
    selectQuery = `SELECT  q.id,q.curriculum AS curriculum_value,q.subject AS subject_value,q.topic AS topic_value,q.paper as paper,
                    q.difficulty_level, q.season, q.zone, q.calculator, q.grade, q.question_type, q.question, q.answer,q.year,
                    cv.field AS curriculum_field,sv.field AS subject_field,tv.field AS topic_field FROM questions q
                    JOIN field_values cv ON q.curriculum = cv.id 
                    JOIN field_values sv ON q.subject = sv.id
                    JOIN field_values tv ON q.topic = tv.id  where q.curriculum=? and  q.subject=? and topic=? and paper=?`;

    queryCount = `SELECT COUNT(*) AS totalCount FROM questions WHERE curriculum=? AND subject=? AND topic=? AND paper=?`;
    queryParams = [curriculum, subject, topic, paper];

    if (season !== '' && zone === '' && dificulty === '' && calculater === '') {
        selectQuery += " AND q.season = ?";
        queryCount += " AND season = ?";
        queryParams.push(season);
        console.log("season----")
    } else if (zone !== '' && season === '' && dificulty === '' && calculater === '') {
        selectQuery += " AND q.zone = ?";
        queryCount += " AND zone = ?";
        queryParams.push(zone);
        console.log("zone")
    } else if (dificulty !== '' && season === '' && zone === '' && calculater === '') {
        selectQuery += " AND q.difficulty_level = ?";
        queryCount += " AND difficulty_level = ?";
        queryParams.push(dificulty);
        console.log("dificulty")
    } else if (calculater !== '' && season === '' && zone === '' && dificulty === '') {
        selectQuery += " AND q.calculator = ?";
        queryCount += " AND calculator = ?";
        queryParams.push(calculater);
        console.log("calculator")
    } else if (season !== '' && zone !== '' && dificulty === '' && calculater === '') {
        selectQuery += " AND q.season = ? And q.zone = ?";
        queryCount += " AND season = ? And zone = ?";
        queryParams.push(season, zone);
        console.log("season,zone")
    } else if (season === '' && zone === '' && dificulty !== '' && calculater !== '') {
        selectQuery += " AND q.difficulty_level = ? And q.calculator = ?";
        queryCount += " AND difficulty_level = ? And calculator = ?";
        queryParams.push(dificulty, calculater);
        console.log("dificulty,calculator")
    } else if (season !== '' && zone === '' && dificulty !== '' && calculater === '') {
        selectQuery += " AND q.season = ? And q.difficulty_level = ?";
        queryCount += " AND season = ? And difficulty_level = ?";
        queryParams.push(season, dificulty);
        console.log("season,dificulty")
    } else if (season === '' && zone !== '' && dificulty === '' && calculater !== '') {
        selectQuery += " AND q.zone = ? And q.calculator = ?";
        queryCount += " AND zone = ? And calculator = ?";
        queryParams.push(zone, calculater);
        console.log("zone,calculator")
    }
    else if (season !== '' && zone !== '' && dificulty !== '' && calculater === '') {
        selectQuery += " And q.season = ? AND q.zone = ? And q.difficulty_level = ?";
        queryCount += " And season = ? AND zone = ? And difficulty_level = ?";
        queryParams.push(season, zone, dificulty);
        console.log("season, zone, dificulty")
    }
    else if (season !== '' && zone !== '' && dificulty === '' && calculater !== '') {
        selectQuery += " And q.season = ? AND q.zone = ? And q.calculator = ?";
        queryCount += " And season = ? AND zone = ? And calculator = ?";
        queryParams.push(season, zone, calculater);
        console.log("djvbh", calculater)
        console.log("season, zone, calculator")
    }
    else if (season !== '' && zone === '' && dificulty !== '' && calculater !== '') {
        selectQuery += " And q.season = ? AND q.difficulty_level = ? And q.calculator = ?";
        queryCount += " And season = ? AND difficulty_level = ? And calculator = ?";
        queryParams.push(season, dificulty, calculater);

        console.log("season, dificulty, calculator")
    }
    else if (season === '' && zone !== '' && dificulty !== '' && calculater !== '') {
        selectQuery += " And q.zone = ? AND q.difficulty_level = ? And q.calculator = ?";
        queryCount += " And zone = ? AND difficulty_level = ? And calculator = ?";
        queryParams.push(zone, dificulty, calculater);
        console.log("zone, dificulty, calculator")
    }
    else if (season !== '' && zone !== '' && dificulty !== '' && calculater !== '') {
        selectQuery += " And q.season= ? And q.zone = ? AND q.difficulty_level = ? And q.calculator = ?";
        queryCount += " And season= ? And zone = ? AND difficulty_level = ? And calculator = ?";
        queryParams.push(season, zone, dificulty, calculater);
        console.log("season, zone, dificulty, calculator")
    }

    selectQuery += " order by q.id ASC LIMIT 0, 10";
    queryParams.push(offset, limit);

    con.query(selectQuery, queryParams, (error, results) => {
        if (error) {
            console.error('Error fetching data:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        con.query(queryCount, queryParams, (err, countResult) => {
            if (err) {
                console.error('Error getting total count:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            const totalCount = countResult[0].totalCount;
            const totalPages = Math.ceil(totalCount / pageSize);
            if (results.length === 0) {
                return res.status(404).json({ message: 'No questions found for the selected filters....!' });
            }
            res.json({ results, totalPages });
        });
    });
});


// Route for handling delete requests
router.delete('/deleteQuestion/:id', (req, res) => {
    const id = req.params.id;
    console.log("delete:", id)
    //const sql = `UPDATE questions SET status = ? WHERE id = ?`;
    const sql = `DELETE FROM questions WHERE id = ?`;
    // Execute the query
    con.query(sql, [id], (error, results, fields) => {
        if (error) {
            console.error('Error deleting item:', error);
            res.status(500).json({ error: 'Error deleting item' });
        } else {
            console.log('Item deleted successfully');
            res.status(200).json({ message: `Question with ID ${id} deleted successfully` });
        }
    });

});


router.get('/geteducationalFields', (req, res) => {
    const query = 'SELECT fv.id AS field_value_id,fv.field_type_id,fv.field,ft.type AS field_type FROM field_values fv JOIN field_typs ft ON fv.field_type_id = ft.id;';
    con.query(query, (err, result) => {
        if (err) {
            res.status(500).json({ error: 'Error in get Branding Details' });
        } else {
            res.json({ res: result });
        }

    })
})



router.post('/saveEducationalField', (req, res) => {
    console.log(req.body)
    const query = 'UPDATE field_values SET field = ?, field_type_id = ? WHERE id = ?';
    con.query(query, [req.body.field, req.body.field_type_id, req.body.field_value_id], (err, result) => {
        if (err) {
            res.status(500).json({ error: '👎 Error In Updating ' });
        } else {
            res.json({ message: '👌 Updated Successfully' });
        }
    });
});



router.get('/getmappedfields', (req, res) => {
    const query = `SELECT 
    mf.id AS map_id,
    cv.field AS curriculum_name,  cv.id AS c_id,
    sv.field AS subject_name,sv.id as s_id,
    tv.field AS topic_name,tv.id as t_id
    FROM 
        map_fields mf
    LEFT JOIN 
        field_values cv ON mf.currculium = cv.id
    LEFT JOIN 
        field_values sv ON mf.subject = sv.id
    LEFT JOIN 
        field_values tv ON mf.topic = tv.id`;
    con.query(query, (err, result) => {
        if (err) {
            res.status(500).json({ error: 'Error in get Branding Details' });
        } else {
            res.json({ res: result });
        }

    })
})


router.post('/updatemappedfield', (req, res) => {
    console.log(req.body);
    // Query to check if the combination already exists
    const checkQuery = 'SELECT COUNT(*) AS count FROM map_fields WHERE currculium = ? AND subject = ? AND topic = ?';
    con.query(checkQuery, [req.body.c_id, req.body.s_id, req.body.t_id], (err, checkResult) => {
        if (err) {
            res.status(500).json({ error: '👎 Error in checking existing data' });
        } else {
            if (checkResult[0].count > 0) {
                // Combination already exists
                res.json({ message: '👎 Combination already exists. No update performed.' });
            } else {
                // Proceed with the update
                const query = 'UPDATE map_fields SET currculium = ?, subject = ?, topic = ? WHERE id = ?';
                con.query(query, [req.body.c_id, req.body.s_id, req.body.t_id, req.body.update_id], (err, result) => {
                    if (err) {
                        res.status(500).json({ error: '👎 Error in updating' });
                    } else {
                        res.json({ message: '👌 Updated successfully' });
                    }
                });
            }
        }
    });
});

router.post('/validateUser', (req, res) => {
    const { username, password } = req.body;
    const query = 'SELECT * FROM users WHERE user_name = ? AND password = ?';
    con.query(query, [username, password], (err, result) => {
        if (err) {
            res.status(500).json({ error: 'Error in fetching user data' });
        } else if (result.length > 0) {
            res.status(200).json({ success: true, data: result[0] });
        } else {
            res.json({ success: false, message: 'Invalid username or password' });
        }
    });
});

module.exports = router;