var _ = require("underscore");
var sha3 = require("js-sha3").sha3_256;

module.exports = {
	"loginAccount": function (identity, userModel, callback) {
		userModel.findOne({
			"where": identity
		}).then(function (user) {
			if (_.isNull(user)) {
				callback(undefined);
			} else {
				callback(user.get());
			}
		});
	},
	"registerAccount": function (identity, userModel, callback) {
		var that = this;
		userModel.findOne({
			"where": _.pick(identity, "email", "password")
		}).then(function (user) {
			if (!_.isNull(user)) {
				callback(undefined);
			} else {
				that.listAccounts(userModel, function (users) {
					if (users && users.length === 0) {
						userModel.create(_.extend(identity, { "admin": true, "active": true })).then(function (user) {
							callback(user.get());
						});
					} else {
						userModel.create(identity).then(function (user) {
							callback(user.get());
						});
					}
				});
			}
		});
	},
	"listAccounts": function (userModel, callback) {
		userModel.findAll().then(function (users) {
			_.each(users, function (user, index, users) {
				users[index] = user.get();
			});
			callback(users);
		});
	},
	"updateAccount": function (identity, userModel, callback) {
		userModel.update(identity, {
			"where": {
				"hashcode": identity.hashcode
			}
		}).then(function (rows) {
			userModel.findOne({
				"where": _.pick(identity, "email", "password")
			}).then(function (user) {
				callback(user.get());
			});
		});
	},
	"updateAccountByAdmin": function (identity, userModel, callback) {
		if (identity.command === "activate" || identity.command === "inactivate") {
			userModel.update({
				"active": (identity.command === "activate") ? true : false
			}, {
					"where": _.pick(identity, "hashcode")
				}).then(function (user) {
					callback(user);
				});
		} else if (identity.command === "user" || identity.command === "administrator") {
			userModel.update({
				"admin": (identity.command === "administrator") ? true : false
			}, {
					"where": _.pick(identity, "hashcode")
				}).done(function (user) {
					callback(user);
				});
		}
	}
};