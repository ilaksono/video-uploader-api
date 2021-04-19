require('dotenv').config();

const app = require('express')();
const PORT = process.env.PORT || 8085;
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const cors = require('cors');

const bcrypt = require('bcrypt');
const saltRounds = 10;

const pool = new Pool({
  connectionString: process.env.DB_CONNECTION_STRING,
})

// app.use(bodyParser.json());
app.use(bodyParser.json())
app.use(cors());
// app.use()

app.listen(PORT, () => console.log('listening on ' + PORT));

app.post('/api/videos/', async (req, res) => {
  if (req.body.cmd === 'upload') {
    const qs = `
    INSERT INTO videos (url, user_id)
    VALUES ($1, $2)
    RETURNING *;`;

    try {
      const data = await pool.query(qs, [req.body.url, req.body.id]);
      if (data) {
        res.send(data);
      } else res.send({ err: 1, msg: 'Insert failed' });
    } catch (er) {
      console.error(er);
      res.send({ err: 1, msg: er });
    }

    return;
  }

  try {

    const qs = `
    SELECT * from videos WHERE
    user_id = $1;`;
    
    const data = await pool
      .query(qs, [req.body.id]);

    if (data) {
      if (data.rows)
        return res.send({ data: data.rows });

    } else
      return res.send({ data: [] });

  } catch (er) {
    console.error(er)
    res.send({ err: 1, msg: 'Invalid request' })
  }
});

app.post('/api/auth', async (req, res) => {

  const qs = `
  SELECT * FROM users 
  WHERE username = $1;`;
  try {
    const data = await pool.query(qs, [req.body.username]);

    if (!data.rows)
      return res.send({ err: 1, msg: 'Invalid username' });

    if (!data.rows.length)
      return res.send({ err: 1, msg: 'Invalid username' });

    bcrypt.compare(req.body.password, data.rows[0].password, (err, result) => {
      if (result)
        return res.send({ data: data.rows[0] });
      else
        return res.send({ err: 1, msg: 'Invalid password' });
    });

  } catch (er) {
    console.error(er);
    res.send({ err: 1, msg: 'Could not find data' });
  }

  // res.send(process.env.DB_HOST);
});
app.post('/api/signup', (req, res) => {

  const qs = `
  INSERT INTO users (username, password)
  VALUES ($1, $2)
  RETURNING *;`;
  bcrypt.hash(req.body.password, saltRounds, async (err, hash) => {
    // Store hash in password DB.
    try {
      const data = await pool
        .query(qs, [req.body.username, hash]);
      if (data)
        return res.send({ data });
      else return res.send({ err: 1, msg: 'Could not save user' });
    } catch (er) {
      console.error(er);
      return res.send(er);
    }
  });
});
