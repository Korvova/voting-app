const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const router = express.Router();

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Voting App API',
      version: '1.0.0',
      description: 'API for managing voting system',
    },
    servers: [
      {
        url: 'http://217.114.10.226:5000',
        description: 'Main server',
      },
    ],
  },
  apis: [__dirname + '/swagger.cjs'],
};

const swaggerSpec = swaggerJsdoc(options);

router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

/**
 * @openapi
 * /api/users/{id}/disconnect:
 *   post:
 *     summary: Disconnect a user
 *     description: Sets the user's online status to false
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the user to disconnect
 *     responses:
 *       200:
 *         description: User successfully disconnected
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     isOnline:
 *                       type: boolean
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post('/users/:id/disconnect', (req, res) => {
  // This is a dummy route to attach OpenAPI docs; actual logic is in users.cjs
});

module.exports = router;