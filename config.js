const sqlInfo = {
    host : "104.199.225.75",
    port : "3306",
    user : "tt",
    password : "tt1108",
    database : "bxt"
}

module.exports = {
    sqlInfo : sqlInfo,
    privateKey : "miniFridge",
    publicUserData: [
        'username',
        'email',
        'create_time',
        'avatar',
        'introduction'
    ],
    
    // 用以獲取資料庫Table名稱，更改時不用更改代碼
    table: {
        User : "User",
        Post : "Post",
        Like : "Likes",
        Follow : "Follow",
        Comment: "Comment",
        PostIt : "PostIt",
        ModelData: "ModelData",
    }
};