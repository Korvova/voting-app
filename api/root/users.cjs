const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @api {post} /api/users/:id/disconnect Disconnect a user
 * @apiName DisconnectUser
 * @apiGroup Users
 * @apiDescription Sets the user's online status to false
 * @apiParam {Number} id User ID (path parameter)
 * @apiSuccess {Boolean} success Operation status
 * @apiSuccess {Object} user Updated user object
 * @apiSuccess {Number} user.id User ID
 * @apiSuccess {Boolean} user.isOnline User online status
 * @apiError (400) BadRequest Invalid user ID or other error
 * @apiErrorExample {json} Error-Response:
 *     {
 *       "error": "User not found"
 *     }
 */
router.post('/:id/disconnect', async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { isOnline: false },
    });
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error disconnecting user:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @api {get} /api/users Get all users
 * @apiName GetUsers
 * @apiGroup Users
 * @apiDescription Retrieves a list of all users with their division information
 * @apiSuccess {Object[]} users List of users
 * @apiSuccess {Number} users.id User ID
 * @apiSuccess {String} users.name User name
 * @apiSuccess {String} users.email User email
 * @apiSuccess {String} users.phone User phone
 * @apiSuccess {String} users.division Division name or 'Нет' if none
 * @apiSuccess {Boolean} users.isOnline User online status
 * @apiError (500) ServerError Database or server error
 * @apiErrorExample {json} Error-Response:
 *     {
 *       "error": "Internal server error"
 *     }
 */
router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { division: true },
    });
    res.json(users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      division: user.division ? user.division.name : 'Нет',
      isOnline: user.isOnline
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @api {post} /api/users Create a new user
 * @apiName CreateUser
 * @apiGroup Users
 * @apiDescription Creates a new user with provided details
 * @apiBody {String} name User name
 * @apiBody {String} email User email
 * @apiBody {String} [phone] User phone (optional)
 * @apiBody {Number} [divisionId] Division ID (optional)
 * @apiBody {String} password User password
 * @apiSuccess {Object} user Created user object
 * @apiSuccess {Number} user.id User ID
 * @apiSuccess {String} user.name User name
 * @apiSuccess {String} user.email User email
 * @apiSuccess {String} user.phone User phone
 * @apiError (400) BadRequest Invalid input data
 * @apiErrorExample {json} Error-Response:
 *     {
 *       "error": "Email already exists"
 *     }
 */
router.post('/', async (req, res) => {
  const { name, email, phone, divisionId, password } = req.body;
  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password,
        divisionId: divisionId ? parseInt(divisionId) : null,
      },
    });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @api {put} /api/users/:id Update a user
 * @apiName UpdateUser
 * @apiGroup Users
 * @apiDescription Updates user details
 * @apiParam {Number} id User ID (path parameter)
 * @apiBody {String} [name] User name (optional)
 * @apiBody {String} [email] User email (optional)
 * @apiBody {String} [phone] User phone (optional)
 * @apiBody {Number} [divisionId] Division ID (optional)
 * @apiBody {String} [password] User password (optional)
 * @apiSuccess {Object} user Updated user object
 * @apiSuccess {Number} user.id User ID
 * @apiSuccess {String} user.name User name
 * @apiSuccess {String} user.email User email
 * @apiSuccess {String} user.phone User phone
 * @apiError (400) BadRequest Invalid user ID or input data
 * @apiErrorExample {json} Error-Response:
 *     {
 *       "error": "User not found"
 *     }
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, divisionId, password } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        name,
        email,
        phone,
        divisionId: divisionId ? parseInt(divisionId) : null,
        password: password || undefined,
      },
    });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @api {delete} /api/users/:id Delete a user
 * @apiName DeleteUser
 * @apiGroup Users
 * @apiDescription Deletes a user by ID
 * @apiParam {Number} id User ID (path parameter)
 * @apiSuccess {Boolean} success Operation status
 * @apiError (400) BadRequest Invalid user ID
 * @apiErrorExample {json} Error-Response:
 *     {
 *       "error": "User not found"
 *     }
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;