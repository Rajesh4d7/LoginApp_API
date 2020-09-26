const config = require('config.js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('_helpers/db');
const User = db.User;

module.exports = {
    authenticate,
    getAll,
    getById,
    create,
    update,
    logoutUser,
    delete: _delete,
    audit
};

async function authenticate({ username, password , ip}) {
    const user = await User.findOne({ username });
    if (user && bcrypt.compareSync(password, user.hash)) {
        user.ipAddress = ip;
        user.loginTime = Date.now();
        user.save();
        const { hash,ipAddress,logoutTime,...userWithoutHash } = user.toObject();
        const token = jwt.sign({ sub: user.id }, config.secret);
        return {
            ...userWithoutHash,
            token
        };
    }
}

async function logoutUser({ username }){
    const user = await User.findOne({ username });
    if (!user){
        throw new Error('Please try again')
    }
    user.logoutTime = Date.now();
    await user.save();
    return user;

}
async function getAll() {
    return await User.find().select('-hash');
}

async function getById(id) {
    return await User.findById(id).select('-hash');
}

async function create(userParam) {
    // validate
    if (await User.findOne({ username: userParam.username })) {
        throw 'Username "' + userParam.username + '" is already taken';
    }

    const user = new User(userParam);
    user.role= userParam.role;
    // hash password
    if (userParam.password) {
        user.hash = bcrypt.hashSync(userParam.password, 10);
    }

    // save user
    await user.save();
}

async function update(id, userParam) {
    const user = await User.findById(id);

    // validate
    if (!user) throw 'User not found';
    if (user.username !== userParam.username && await User.findOne({ username: userParam.username })) {
        throw 'Username "' + userParam.username + '" is already taken';
    }

    // hash password if it was entered
    if (userParam.password) {
        userParam.hash = bcrypt.hashSync(userParam.password, 10);
    }

    // copy userParam properties to user
    Object.assign(user, userParam);

    await user.save();
}

async function _delete(id) {
    await User.findByIdAndRemove(id);
}

async function audit(id){
    const auditUser = await User.findById(id);
    if(auditUser.role != "Auditor"){
        throw new Error (user.username+" don't have privilege to access");
    }
    const users = await User.aggregate([{$project:{_id:1, username:1, role:1, loginTime:1, logoutTime:1 }}]);
    return users;
}