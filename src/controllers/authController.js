const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');

class AuthController {
  async register(req, res) {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (await userRepository.exists(email)) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const user = await userRepository.create({
        email,
        passwordHash: hashedPassword,
        firstName,
        lastName,
        role: 'member'
      });

      const token = jwt.sign({ 
        userId: user.id,
        id: user.id, 
        email: user.email, 
        role: user.role 
      }, process.env.JWT_SECRET, { expiresIn: '7d' });

      res.status(201).json({
        message: 'User created successfully',
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      const user = await userRepository.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ 
        userId: user.id,
        id: user.id, 
        email: user.email, 
        role: user.role 
      }, process.env.JWT_SECRET, { expiresIn: '7d' });

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new AuthController();