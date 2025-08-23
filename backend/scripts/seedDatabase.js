const { Menu, UserRole, UserRoleMenu, User } = require('../models');
const sequelize = require('../db/db');
const bcrypt = require('bcrypt');

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');

    // Create user roles
    console.log('Creating user roles...');
    const roles = await UserRole.bulkCreate([
      { nama: 'participant', flag: 'Y' },
      { nama: 'host', flag: 'Y' },
      { nama: 'admin', flag: 'Y' }
    ], { ignoreDuplicates: true });

    console.log('User roles created:', roles.length);
    console.log('Roles:', roles.map(r => ({ id: r.userRoleId, name: r.nama })));

    // Create menus
    console.log('\nCreating menus...');
    const menus = await Menu.bulkCreate([
      { 
        displayLabel: 'Files', 
        iconMenu: null, 
        sequenceMenu: 1, 
        parentMenu: null, 
        slug: 'files', 
        flag: 'Y' 
      },
      { 
        displayLabel: 'Chat/Messaging', 
        iconMenu: null, 
        sequenceMenu: 2, 
        parentMenu: null, 
        slug: 'chat', 
        flag: 'Y' 
      },
      { 
        displayLabel: 'Annotate', 
        iconMenu: null, 
        sequenceMenu: 3, 
        parentMenu: null, 
        slug: 'annotate', 
        flag: 'Y' 
      },
      { 
        displayLabel: 'Share Screen', 
        iconMenu: null, 
        sequenceMenu: 4, 
        parentMenu: null, 
        slug: 'share-screen', 
        flag: 'Y' 
      },
      { 
        displayLabel: 'Recording', 
        iconMenu: null, 
        sequenceMenu: 5, 
        parentMenu: null, 
        slug: 'recording', 
        flag: 'Y' 
      },
      { 
        displayLabel: 'Agenda', 
        iconMenu: null, 
        sequenceMenu: 6, 
        parentMenu: null, 
        slug: 'agenda', 
        flag: 'Y' 
      },
      { 
        displayLabel: 'Materials', 
        iconMenu: null, 
        sequenceMenu: 7, 
        parentMenu: null, 
        slug: 'materials', 
        flag: 'Y' 
      },
      { 
        displayLabel: 'Survey', 
        iconMenu: null, 
        sequenceMenu: 8, 
        parentMenu: null, 
        slug: 'survey', 
        flag: 'Y' 
      },
      { 
        displayLabel: 'Service', 
        iconMenu: null, 
        sequenceMenu: 9, 
        parentMenu: null, 
        slug: 'service', 
        flag: 'Y' 
      }
    ], { ignoreDuplicates: true });

    console.log('Menus created:', menus.length);
    console.log('Menus:', menus.map(m => ({ id: m.menuId, label: m.displayLabel, slug: m.slug })));

    // Create role-menu relationships
    console.log('\nCreating role-menu relationships...');
    const roleMenuRelations = [
      // Participant can access basic features
      { userRoleId: 1, menuId: 1, flag: 'Y' }, // Files
      { userRoleId: 1, menuId: 2, flag: 'Y' }, // Chat/Messaging
      { userRoleId: 1, menuId: 6, flag: 'Y' }, // Agenda
      { userRoleId: 1, menuId: 7, flag: 'Y' }, // Materials
      { userRoleId: 1, menuId: 8, flag: 'Y' }, // Survey
      
      // Host can access most features
      { userRoleId: 2, menuId: 1, flag: 'Y' }, // Files
      { userRoleId: 2, menuId: 2, flag: 'Y' }, // Chat/Messaging
      { userRoleId: 2, menuId: 3, flag: 'Y' }, // Annotate
      { userRoleId: 2, menuId: 4, flag: 'Y' }, // Share Screen
      { userRoleId: 2, menuId: 5, flag: 'Y' }, // Recording
      { userRoleId: 2, menuId: 6, flag: 'Y' }, // Agenda
      { userRoleId: 2, menuId: 7, flag: 'Y' }, // Materials
      { userRoleId: 2, menuId: 8, flag: 'Y' }, // Survey
      { userRoleId: 2, menuId: 9, flag: 'Y' }, // Service
      
      // Admin can access everything
      { userRoleId: 3, menuId: 1, flag: 'Y' }, // Files
      { userRoleId: 3, menuId: 2, flag: 'Y' }, // Chat/Messaging
      { userRoleId: 3, menuId: 3, flag: 'Y' }, // Annotate
      { userRoleId: 3, menuId: 4, flag: 'Y' }, // Share Screen
      { userRoleId: 3, menuId: 5, flag: 'Y' }, // Recording
      { userRoleId: 3, menuId: 6, flag: 'Y' }, // Agenda
      { userRoleId: 3, menuId: 7, flag: 'Y' }, // Materials
      { userRoleId: 3, menuId: 8, flag: 'Y' }, // Survey
      { userRoleId: 3, menuId: 9, flag: 'Y' }  // Service
    ];

    await UserRoleMenu.bulkCreate(roleMenuRelations, { ignoreDuplicates: true });
    console.log('Role-menu relationships created');

    // Create users for each role
    console.log('\nCreating users for each role...');
    
    // Check if users already exist
    const existingUsers = await User.findAll({
      where: {
        username: ['participant1', 'host1', 'admin1']
      }
    });

    const existingUsernames = existingUsers.map(u => u.username);
    const usersToCreate = [];

    if (!existingUsernames.includes('participant1')) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      usersToCreate.push({
        username: 'participant1',
        password: hashedPassword,
        userRoleId: 1
      });
    }

    if (!existingUsernames.includes('host1')) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      usersToCreate.push({
        username: 'host1',
        password: hashedPassword,
        userRoleId: 2
      });
    }

    if (!existingUsernames.includes('admin1')) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      usersToCreate.push({
        username: 'admin1',
        password: hashedPassword,
        userRoleId: 3
      });
    }

    if (usersToCreate.length > 0) {
      const newUsers = await User.bulkCreate(usersToCreate);
      console.log('New users created:', newUsers.length);
    } else {
      console.log('All users already exist');
    }



    console.log('\nDatabase seeding completed successfully!');
    
    // Display the created data
    console.log('\n--- Created Data Summary ---');
    
    const allRoles = await UserRole.findAll({ where: { flag: 'Y' } });
    console.log('User Roles:', allRoles.map(r => ({ id: r.userRoleId, name: r.nama })));
    
    const allMenus = await Menu.findAll({ where: { flag: 'Y' } });
    console.log('Menus:', allMenus.map(m => ({ id: m.menuId, label: m.displayLabel, slug: m.slug })));
    
    const allRoleMenus = await UserRoleMenu.findAll({ where: { flag: 'Y' } });
    console.log('Role-Menu Relationships:', allRoleMenus.length);

    const allUsers = await User.findAll({
      include: [{ model: UserRole, as: 'UserRole' }]
    });
    console.log('Users:', allUsers.map(u => ({ 
      username: u.username, 
      role: u.UserRole?.nama,
      password: 'password123'
    })));

    console.log('\n--- Login Credentials ---');
    console.log('Participant: username=participant1, password=password123');
    console.log('Host: username=host1, password=password123');
    console.log('Admin: username=admin1, password=password123');

    console.log('\n--- Database Tables Created ---');
    console.log('✅ m_user_role - Contains 3 roles (participant, host, admin)');
    console.log('✅ m_menu - Contains 9 menus (Files, Chat, Annotate, etc.)');
    console.log('✅ m_user_role_menu - Contains role-menu access rules');
    console.log('✅ users - Contains 3 users with different roles');
    console.log('✅ Foreign key relationships established');

    console.log('\n--- Menu Access by Role ---');
    console.log('👤 Participant: Files, Chat, Agenda, Materials, Survey');
    console.log('🎯 Host: Files, Chat, Annotate, Share Screen, Recording, Agenda, Materials, Survey, Service');
    console.log('👑 Admin: All 9 menus');

    console.log('\n--- Next Steps ---');
    console.log('1. Test login with these credentials');
    console.log('2. Check if role-based access works');
    console.log('3. Test menu endpoints with different roles');

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

// Run the seeder if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('\nSeeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedDatabase;
