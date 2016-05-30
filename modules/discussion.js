var _ = require("underscore");
var sha3 = require("js-sha3").sha3_256;

module.exports = {
    "createDiscussion": function (identity, discussionModel, callback) {
        discussionModel.create(identity).then(function (discussion) {
            discussionModel.findOne({
                "where": _.pick(identity, "discussionHashcode")
            }).then(function (discussion) {
                callback(discussion.get());
            });
        });
    },
    "listDiscussions": function (identity, discussionModel, callback) {
        discussionModel.findAll({
            "where": identity
        }).then(function (discussions) {
            _.each(discussions, function (discussion, index, discussions) {
                discussions[index] = discussion.get();
            });

            callback(discussions);
        });
    },
    "deleteDiscussion": function (identity, discussionModel, callback) {
        if (identity.command === "delete") {
            discussionModel.destroy({
                "where": _.pick(identity, "discussionHashcode")
            }).done(function (discussion) {
                callback(discussion);
            });
        }
    },
    "getDiscussion": function (identity, discussionModel, callback) {
        discussionModel.findOne({
            "where": _.pick(identity, "discussionHashcode")
        }).then(function (discussion) {
           
            
            callback(discussion.get());
        });
    }
};