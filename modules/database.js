exports.initialize = function (db, Sequelize) {
	var User = db.define("user", {
		"firstName": {
			type: Sequelize.STRING
		},
		"lastName": {
			type: Sequelize.STRING
		},
		"email": {
			type: Sequelize.STRING,
			unique: true
		},
		"password": {
			type: Sequelize.STRING
		},
		"hashcode": {
			type: Sequelize.STRING,
			unique: true
		},
		"active": {
			type: Sequelize.BOOLEAN,
			defaultValue: false
		},
		"admin": {
			type: Sequelize.BOOLEAN,
			defaultValue: false
		},
		"memberSince": {
			type: Sequelize.DATE
		},
		"profileBiography": {
			type: Sequelize.TEXT,
			defaultValue: "Blank biography."
		},
		"profileImage": {
			type: Sequelize.STRING
		}
	}, {
			freezeTableName: true
		});

	var Discussion = db.define("discussion", {
		"discussionName": {
			type: Sequelize.STRING
		},
		"discussionCreator": {
			type: Sequelize.STRING
		},
		"discussionHashcode": {
			type: Sequelize.STRING
		},
		"discussionPrivacy": {
			type: Sequelize.BOOLEAN
		},
		"discussionSince": {
			type: Sequelize.DATE
		}
	}, {
			freezeTableName: true
		});

	db.sync({
		force: false
	});

	return {
		"userModel": User,
		"discussionModel": Discussion
	};
};
