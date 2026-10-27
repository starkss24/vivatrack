const publicUser = (u) => ({ id: String(u._id), name: u.name, email: u.email, role: u.role, rollNo: u.rollNo });
module.exports = { publicUser };
