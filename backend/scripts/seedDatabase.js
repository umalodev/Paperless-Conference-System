// seeders/seed.js
const { Menu, UserRole, UserRoleMenu, User, Meeting } = require("../models");
const sequelize = require("../db/db");
const bcrypt = require("bcrypt");

async function ensureRole(name) {
  const [role] = await UserRole.findOrCreate({
    where: { nama: name },
    defaults: { nama: name, flag: "Y" },
  });
  return role;
}

async function ensureUser({ username, password, roleId }) {
  const existing = await User.findOne({ where: { username } });
  if (existing) return existing;

  const hashedPassword = await bcrypt.hash(password, 10);
  return User.create({
    username,
    password: hashedPassword,
    userRoleId: roleId,
  });
}

async function ensureRoleMenu(userRoleId, menuId) {
  await UserRoleMenu.findOrCreate({
    where: { userRoleId, menuId },
    defaults: { userRoleId, menuId, flag: "Y" },
  });
}

async function seedDatabase() {
  try {
    console.log("Starting database seeding...");

    // --- ROLES ---
    console.log("Ensuring user roles (participant, host, admin, assist)...");
    const roleNames = ["participant", "host", "admin", "assist"];
    const roleMap = {};
    for (const rn of roleNames) {
      const r = await ensureRole(rn);
      roleMap[rn] = r.userRoleId;
    }
    console.log("Roles:", roleMap);

    // --- MENUS ---
    console.log("\nCreating menus (if not exist)...");
    const menuPayloads = [
      {
        displayLabel: "Participant",
        iconMenu: "img/participant.png",
        sequenceMenu: 1,
        parentMenu: null,
        slug: "participant",
        flag: "Y",
      },
      {
        displayLabel: "Agenda",
        iconMenu: "img/agenda.png",
        sequenceMenu: 2,
        parentMenu: null,
        slug: "agenda",
        flag: "Y",
      },
      {
        displayLabel: "Materials",
        iconMenu: "img/materials.png",
        sequenceMenu: 3,
        parentMenu: null,
        slug: "materials",
        flag: "Y",
      },
      {
        displayLabel: "Survey",
        iconMenu: "img/survey.png",
        sequenceMenu: 4,
        parentMenu: null,
        slug: "survey",
        flag: "Y",
      },
      {
        displayLabel: "Files",
        iconMenu: "img/files.png",
        sequenceMenu: 5,
        parentMenu: null,
        slug: "files",
        flag: "Y",
      },
      {
        displayLabel: "Chating",
        iconMenu: "img/chating.png",
        sequenceMenu: 6,
        parentMenu: null,
        slug: "chating",
        flag: "Y",
      },
      {
        displayLabel: "Notes",
        iconMenu: "img/notes.png",
        sequenceMenu: 7,
        parentMenu: null,
        slug: "notes",
        flag: "Y",
      },
      {
        displayLabel: "Whiteboard",
        iconMenu: "img/whiteboard.png",
        sequenceMenu: 8,
        parentMenu: null,
        slug: "whiteboard",
        flag: "Y",
      },

      {
        displayLabel: "Services",
        iconMenu: "img/services.png",
        sequenceMenu: 9,
        parentMenu: null,
        slug: "services",
        flag: "Y",
      },
    ];

    // upsert menus one by one to keep IDs stable
    for (const m of menuPayloads) {
      await Menu.findOrCreate({
        where: { slug: m.slug },
        defaults: m,
      });
    }

    const menus = await Menu.findAll({ where: { flag: "Y" } });
    const menuIdBySlug = Object.fromEntries(
      menus.map((m) => [m.slug, m.menuId])
    );
    const allMenuIds = Object.values(menuIdBySlug);
    console.log(
      "Menus:",
      menus.map((m) => ({ id: m.menuId, slug: m.slug }))
    );

    // --- ROLE-MENU RELATIONS ---
    console.log("\nEnsuring role-menu relationships...");
    // Participant: akses semua seperti semula
    for (const menuId of allMenuIds) {
      await ensureRoleMenu(roleMap["participant"], menuId);
    }
    // Host: akses semua
    for (const menuId of allMenuIds) {
      await ensureRoleMenu(roleMap["host"], menuId);
    }
    // Admin: akses semua
    for (const menuId of allMenuIds) {
      await ensureRoleMenu(roleMap["admin"], menuId);
    }
    // Assist: samakan dengan host (akses semua)
    for (const menuId of allMenuIds) {
      await ensureRoleMenu(roleMap["assist"], menuId);
    }
    console.log("Role-menu relations ensured for all roles.");

    // --- USERS ---
    console.log("\nEnsuring users for each role...");
    await ensureUser({
      username: "participant1",
      password: "password123",
      roleId: roleMap["participant"],
    });
    await ensureUser({
      username: "host1",
      password: "password123",
      roleId: roleMap["host"],
    });
    await ensureUser({
      username: "admin1",
      password: "password123",
      roleId: roleMap["admin"],
    });
    // NEW: assist user
    await ensureUser({
      username: "assist1",
      password: "password123",
      roleId: roleMap["assist"],
    });

    // --- DEFAULT MEETING ---
    console.log("\nEnsuring default meeting...");
    const adminUser = await User.findOne({ where: { username: "admin1" } });
    if (!adminUser) {
      throw new Error(
        "admin1 not found; required to set as default meeting owner due to NOT NULL userId constraint"
      );
    }

    let defaultMeeting = await Meeting.findOne({
      where: { isDefault: true, flag: "Y" },
    });
    if (!defaultMeeting) {
      const existing1000 = await Meeting.findByPk(1000);
      const meetingId = existing1000
        ? Math.floor(Math.random() * 900000) + 100000
        : 1000;

      defaultMeeting = await Meeting.create({
        meetingId,
        title: "UP-CONNECT Default Room",
        description: "Lobby selalu aktif saat tidak ada meeting lain.",
        startTime: new Date(),
        endTime: new Date("2099-12-31T23:59:59Z"),
        userId: adminUser.userId || adminUser.id,
        status: "started",
        maxParticipants: 200,
        currentParticipants: 0,
        flag: "Y",
        isDefault: true,
      });

      console.log("✅ Default meeting created:", {
        meetingId: defaultMeeting.meetingId,
        title: defaultMeeting.title,
        status: defaultMeeting.status,
        isDefault: defaultMeeting.isDefault,
      });
    } else {
      if (defaultMeeting.status !== "started") {
        await defaultMeeting.update({ status: "started" });
      }
      console.log("ℹ️ Default meeting already exists:", {
        meetingId: defaultMeeting.meetingId,
        status: defaultMeeting.status,
      });
    }

    console.log("\nDatabase seeding completed successfully!");

    // --- SUMMARY ---
    const allRoles = await UserRole.findAll({ where: { flag: "Y" } });
    console.log(
      "User Roles:",
      allRoles.map((r) => ({ id: r.userRoleId, name: r.nama }))
    );

    const allMenus = await Menu.findAll({ where: { flag: "Y" } });
    console.log(
      "Menus:",
      allMenus.map((m) => ({
        id: m.menuId,
        label: m.displayLabel,
        slug: m.slug,
      }))
    );

    const allRoleMenus = await UserRoleMenu.findAll({ where: { flag: "Y" } });
    console.log("Role-Menu Relationships:", allRoleMenus.length);

    const allUsers = await User.findAll({
      include: [{ model: UserRole, as: "UserRole" }],
    });
    console.log(
      "Users:",
      allUsers.map((u) => ({
        username: u.username,
        role: u.UserRole?.nama,
        password: "password123",
      }))
    );

    console.log("\n--- Login Credentials ---");
    console.log("Participant: username=participant1, password=password123");
    console.log("Host:        username=host1,        password=password123");
    console.log("Admin:       username=admin1,       password=password123");
    console.log("Assist:      username=assist1,      password=password123");

    console.log("\n--- Database Tables Updated ---");
    console.log(
      "✅ m_user_role - Contains 4 roles (participant, host, admin, assist)"
    );
    console.log("✅ m_menu - Contains 8 menus");
    console.log(
      "✅ m_user_role_menu - Role-menu access rules (now includes assist)"
    );
    console.log("✅ users - Contains 4 users with different roles");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

// Run the seeder if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log("\nSeeding completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}

module.exports = seedDatabase;
