import Member from "../models/Member.js";

export const findMember = async ({
    slackUserId,
    email,
    name,
}) => {

    const query = [];

    if (slackUserId) {
        query.push({ slackUserId });
    }

    if (email) {
        query.push({ email });
    }

    if (name) {
        query.push({
            name: new RegExp(`^${name}$`, "i"),
        });
    }

    if (!query.length) {
        return null;
    }

    return await Member.findOne({
        $or: query,
    }).lean();
};