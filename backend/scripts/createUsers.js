const bcrypt = require('bcrypt');
const { User } = require('../models');
const sequelize = require('../db/db');

// Sample users data with three roles
const usersData = [
  {
    username: 'admin',
    password: 'admin123',
    role: 'admin'
  },
  {
    username: 'moderator',
    password: 'moderator123',
    role: 'moderator'
  },
  {
    username: 'user',
    password: 'user123',
    role: 'user'
  },
  {
    username: 'admin2',
    password: 'admin456',
    role: 'admin'
  },
  {
    username: 'moderator2',
    password: 'moderator456',
    role: 'moderator'
  },
  {
    username: 'user2',
    password: 'user456',
    role: 'user'
  }
];

async function createUsers() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Hash passwords and create users
    for (const userData of usersData) {
      // Check if user already exists
      const existingUser = await User.findOne({
        where: { username: userData.username }
      });

      if (existingUser) {
        console.log(`User '${userData.username}' already exists, skipping...`);
        continue;
      }

      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      // Create user
      const user = await User.create({
        username: userData.username,
        password: hashedPassword,
        role: userData.role
      });

      console.log(`User '${user.username}' with role '${user.role}' created successfully.`);
    }

    console.log('All users created successfully!');
    
    // Display all users
    const allUsers = await User.findAll({
      attributes: ['id', 'username', 'role', 'created_at']
    });
    
    console.log('\nCurrent users in database:');
    console.table(allUsers.map(user => ({
      ID: user.id,
      Username: user.username,
      Role: user.role,
      'Created At': user.created_at
    })));

  } catch (error) {
    console.error('Error creating users:', error);
  } finally {
    // Close database connection
    await sequelize.close();
    console.log('Database connection closed.');
  }
}

// Run the script
createUsers();
