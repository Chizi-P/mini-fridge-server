/**
 * 伺服器用於 miniFridge 應用程式使用
 * 存取 SQL 資料庫資料
 * 
 */

// ！ 嘗試缺乏參數時提示缺的參數


const { resolveSoa } = require('dns');
const express = require('express');
const multer = require('multer');
const app = express();
const http = require('http');
const httpServer = http.createServer(app);
const bodyParser = require('body-parser')

// 載入jwt函數庫協助驗證token
const jwt = require('jsonwebtoken');

/** 資料庫連接 */
const mysql = require('mysql');
const config = require('./config');
const { EWOULDBLOCK, RSA_NO_PADDING } = require('constants');
const { table } = require('console');
const { url } = require('inspector');
const Table = config.table;

const con = mysql.createPool(config.sqlInfo);
console.log('-- Connected SQL database');

/** 伺服器 */
const port = process.env.PORT || 60000;
app.set('secret', config.privateKey);

// // 套用 middleware
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

const serverPath = 'https://minifridge.herokuapp.com/';

/** 靜態文件載入 */
// 暫時沒有
app.use(express.static(__dirname + '/public'));
app.get('/web', (req, res) => {
    res.redirect("http://localhost:60000/fridge.html")
});

// 初始化設定
const upload = multer({
    fileFilter (req, file, callback) {  // 限制檔案格式為 image
        if (!file.mimetype.match(/^image/)) {
            callback(new Error().message = '檔案格式錯誤');
        } else {
            callback(null, true);
        }
    }
});

// app.set("view engine", "ejs");

// app.get('/ejs', (req, res) => {
//     res.render("ejs", {game: "good"});
// });

app.use((req, res, next) => {
    for (const [key, value] of Object.entries(req.query)) {
        if (Array.isArray(value)) {
            return res.json({success: false, message: "不能傳入陣列"});
        }
    }
    next();
});
/[-'']/g

/** 
 * 未登陸：
 * app 可以取得公開的資料。
 * 
 * 已登陸：
 * api 需要 token 驗證，存取得用戶資料。 
 */

 
// 獲取用戶公開資料
app.get('/user/:username/userdata', (req, res) => {
    if (paramsCorrection(req.params, 'username')) {
        return res.json({success: false, message: '參數不完整'});
    }
    const { username } = req.params;
    sqlSelect(Table.User, `username = '${username}'`, config.publicUserData, result => {
        res.json(result);
    });
});

// 獲取用戶貼文
app.get('/user/:username/post', (req, res) => {
    if (paramsCorrection(req.params, 'username')) {
        return res.json({success: false, message: '參數不完整'});
    }
    const { username } = req.params;
    const sql = `select * from Post where username = '${username}' order by create_time desc`
    con.query(sql, (error, result) => {
        res.json(
            !error
            ? {success: true, message: "獲取用戶貼文成功", result: result}
            : {success: false, message: "獲取用戶貼文失敗", error: error}
        );
    });
    // sqlSelect(Table.Post, `username = '${username}'`, '*', result => {
    //     res.json(result);
    // });
});

// app端收藏用，透過postID獲取post
app.get('/post/postID/:postID' , (req, res) => {
    const sql = "select * from Post where ?";
    con.query(sql, {postID : req.params.postID}, (error, result) => {
        console.log(result)
        res.json(
            !error && result.length > 0
            ? {success: true, message: "獲取用戶貼文成功", result: result[0]}
            : {success: false, message: "獲取用戶貼文失敗", error: error}
        )
    });
});

// 獲取關注貼文
app.post('/user/:username/followpost', (req, res) => {
    if (paramsCorrection(req.params, 'username')) {
        return res.json({success: false, message: '參數不完整'});
    }
    const { username } = req.params;
    // ！
    if (req.body.postType != "文章" && req.body.postType != "食譜" && req.body.postType != "全部") {
        return res.json({success: false, message: '傳入了不正確參數'});
    }
    console.log('username: ', req.params.username, 'postType: ', req.body.postType)
    var wherePostType = "";
    if (req.body.postType == "文章" || req.body.postType == "食譜") {
        wherePostType = `and postType = '${req.body.postType}'`
    }

    sqlSelect(Table.Follow, `follower = '${req.params.username}'`, 'following', result1 => {
        var followings = [];
        for (let i = 0; i < result1.result.length; i++) {
            followings[i] = result1.result[i].following
        }
        console.log("followings: ", followings)
        const usernamein = followings.length ? `, '${followings.join("', '")}'` : "";
        console.log("usernamein: ", usernamein)
        const sql = `select * from Post where username in('${username}'${usernamein}) ${wherePostType} order by create_time desc`;
        console.log('sql: ', sql)
        con.query(sql, (error, result2) => {
            console.log('result: ', result2);
            res.json(
                !error
                ? {success: true, message: "獲取關注貼文成功", result: result2}
                : {success: false, message: "獲取關注貼文失敗", error: error}
            );
        });
    });

    // const sql = `select Follow.following Post.* from Follow inner join Post on Follow.follower = Post.username where follower = '${username}' order by create_time desc`;

    // con.query(sql, (error, result) => {
    //     console.log('followPost: ', result);
    //     res.json(
    //         !error
    //         ? {success: true, message: "獲取關注貼文成功", result: result}
    //         : {success: false, message: "獲取關注貼文失敗", error: error}
    //     );
    // });
    // const sql = `select * from Post where username = '${username}' ${where} order by create_time desc`;

});

// 獲取熱門貼文
app.post('/hotpost', (req, res) => {
    // if (paramsCorrection(req.params, 'username')) {
    //     return res.json({success: false, message: '參數不完整'});
    // }
    const sql = `select * from Post order by create_time desc`
    con.query(sql, (error, result) => {
        console.log("error: ", error)
        console.log("result: ", result)
        res.json(
            !error
            ? {success: true, message: "獲取熱門貼文成功", result: result}
            : {success: false, message: "獲取熱門貼文失敗", error: error}
        );
    });
});

// 獲取評論 ！ 地址要修改
app.get('/post/:postID', (req, res) => {
    if (paramsCorrection(req.params, 'postID')) {
        return res.json({success: false, message: '參數不完整'});
    }
    const { postID } = req.params;
    const sql = `select * from Comment where postID = ${postID} order by create_time desc`
    con.query(sql, (error, result) => {
        res.json(
            !error
            ? {success: true, message: "獲取評論成功", result: result}
            : {success: false, message: "獲取評論失敗", error: error}
        );
    });
});

// 獲取頭像
app.get('/user/:username/avatar', (req, res) => {
    if (paramsCorrection(req.params, 'username')) {
        return res.json({success: false, message: '參數不完整'});
    }
    const { username } = req.params;
    sqlSelect(Table.User, `username = '${username}'`, 'avatar', result => {
        // res.json(result)
        console.log(result)
        res.redirect("/" + result.result[0].avatar);
    })
})

app.get('/search/userlike/:username', (req, res) => {
    if (paramsCorrection(req.params, 'username')) {
        return res.json({success: false, message: '參數不完整'});
    }
    const { username } = req.params;
    sqlSelect(Table.User, `username like '%${username}%'`, '*', result => {
        for (let i = 0; i < result.result.length; i++) {
            delete result.result[i].password;
        }
        res.json(result);
    });
});

// 參數校正
const paramsCorrection = (params, ...paramName) => !paramName.every(e => params.hasOwnProperty(e));

const api = express.Router();

api.get('/', (req, res) => {
    res.json({message: 'APIs'});
});

// 註冊 未有token所以放在app
api.post('/signup', upload.single('avatar'), async (req, res, next) => {
    // if (paramsCorrection(req.body,'username', 'password', 'email')) {
    //     return res.json({success: false, message: '參數不完整'});
    // }
    const { username, password, email } = req.body;
    // 名稱有效驗證
    if (!usernameRuleCN.test(username)) {
        return res.json({success: false, message: '無效的用戶名稱', error: "無效的用戶名稱"});
    }
    // 檢查名稱是否已被使用
    // ！ username傳不了大寫url
    isUnusedUsername(username, result => {
        if (result.success && result.isUnused) nextTo();
        else return res.json({success: false, message: '此用戶名稱已被使用'});
    });
    const nextTo = () => {
        // 密碼有效驗證
        if (!passwordRuleWithoutUppercaseLetter.test(password)) {
            return res.json({success: false, message: '無效的密碼，請符合規則'});
        }
        // 電郵有效驗證
        if (!emailRule.test(email)) {
            return res.json({success: false, message: '無效的電郵'});
        }
        // ！ 驗證電郵是否已被使用
        // 一切無誤
        next()
    }
}, uploadImageWithoutToken, (req, res) => {
    signUp(req.body.username, req.body.password, req.body.email, req.url, req.body.userType, result => {
        return res.json(result);
    });
});

// 登陸
api.get('/signin', (req, res) => {
    if (paramsCorrection(req.query, 'username', 'password')) {
        return res.json({success: false, message: '參數不完整'});
    }
    const { username, password } = req.query;
    verifyUser(username, password, result => {
        if (result.success) {
            // 成功登陸
            sqlSelect(Table.User, `username = '${username}'`, '*', result => {
                if (result.success) {
                    console.log("開始製作 token")
                    delete result.result[0].password;
                    console.log('password:', result.result[0])
                    // 製作token
                    const token = jwt.sign(JSON.stringify(result.result[0]), config.privateKey);
                    console.log('username: ', username ,' token: ', token)
                    res.json({
                        success: true,
                        message: 'Your token!',
                        result: {token: token}
                    });
                } else {
                    console.log(result.message);
                    res.json({
                        success: false,
                        message: result.message
                    });
                }
            });
        } else {
            console.log(result.message);
            res.json({
                success: false,
                message: result.message
            });
        }
    });
});

// 每次訪問先驗證 token 和 userName
api.use((req, res, next) => {
    // 暫時都用用傳入params ?token=###
    let token = req.query.token || req.body.token || req.headers['token'] || req.headers['authorization'] || ''; // Express headers are auto converted to lowercase
    if (token) {
        // 驗證token
        if (token.startsWith('Bearer ')) {
            // Remove Bearer from string
            token = token.slice(7, token.length);
        }
        jwt.verify(token, config.privateKey, (error, decoded) => {
            if (error) {
                return res.json({success: false, message: '驗證 token 失敗', error: error});
            } else {
                req.decoded = decoded;
                next();
            }
        });
    } else {
        return res.status(403).send({
            success: false,
            message: '沒有提供 token'
        });
    }
});

// 獲取解碼的 token
// ！ 測試結束後刪除 
api.get('/tokendecoded', (req, res) => {
    res.json(req.decoded);
});

// 獲得用戶個人資料
api.get('/userdata', (req, res) => {
    sqlSelect(Table.User, `username = '${req.decoded.username}'`, '*', result => {
        delete result.result[0].password;
        res.json(result);
    });
});

// 修改個人資料
api.get('/editprofile', (req, res) => {
    if (paramsCorrection(req.query, 'option', 'value')) {
        return res.json({success: false, message: '參數不完整'});
    }
    const { option, value } = req.query;
    const options = ['username', 'email', 'introduction'];
    if (!options.includes(req.query.option)) {
        return res.json({success: false, message: '沒有該修改項目'});
    }
    sqlUpdate(Table.User, `username = '${req.decoded.username}'`, option, value, result => {
        res.json(
            result.success 
            ? {success: true, message: '個人資料修改成功'} 
            : {success: false, message: '個人資料修改失敗', error: result.error}
        );
    });
});

// 更改頭像
api.post('/userdata/avatar/update', upload.single('avatar') , updateImage);

// 我跟蹤了誰
api.get('/following', (req, res) => {
    sqlSelect(Table.Follow, `follower = '${req.decoded.username}'`, 'following', result => {
        res.json(result);
    });
});

// 誰跟蹤了我
api.get('/follower', (req, res) => {
    sqlSelect(Table.Follow, `following = '${req.decoded.username}'`, 'follower', result => {
        res.json(result);
    });
});

// 發貼文 ！images的類型要確定 一個Array
api.post('/post', upload.single('images'), uploadImage, async (req, res) => {
    // ！ 參數校正
    // if (paramsCorrection(req.query, 'images', 'introduction')) {
    //     return res.json({success: false, message: '參數不完整'});
    // }
    const { title, introduction, postType } = req.query;
    const images = req.url;
    sqlInsert(Table.Post, ['username', 'images', 'title', 'introduction', 'postType'], [req.decoded.username, images, title, introduction, postType], result => {
        res.json(result);
    });
});

// 刪除貼文
api.get('deletepost', (req, res) => {
    if (paramsCorrection(req.query, 'postID')) {
        return res.json({success: false, message: '參數不完整'});
    }
    const postID = req.query.postID;
    sqlDelete(Table.Post, `postID = ${postID}`, result => {
        res.json(result);
    });
});
 
// 進行追蹤
api.post('/tofollow/:username', (req, res) => {
    if (paramsCorrection(req.params, 'username')) {
        return res.json({success: false, message: '參數不完整'});
    }
    const { username } = req.params;
    sqlInsert(Table.Follow, ['follower', 'following'], [req.decoded.username, username], result => {
        res.json(result);
    });
});

// 取消追蹤
api.post('/unfollow/:username', (req, res) => {
    if (paramsCorrection(req.params, 'username')) {
        return res.json({success: false, message: '參數不完整'});
    }
    const { username } = req.params;
    // const conditions = `username = '${req.decoded.username}' and fromUser = '${fromUser}'`
    sqlDelete(Table.Follow, `follower = '${req.decoded.username}' and following = '${username}'`, result => {
        res.json(
            result.success
            ? {success: true, message: '取消跟蹤成功'} 
            : {success: false, message: '取消跟蹤失敗', error: result.error}
        );
    });
});

app.get('/:follower/isfollow/:following', (req, res) => {
    // if (paramsCorrection(req.params, 'follower, following')) {
    //     return res.json({success: false, message: '參數不完整'});
    // }
    const { follower, following } = req.params;
    const sql = `select count(*)>0 as isFollow from Follow where follower = '${follower}' and following = '${following}'`;
    con.query(sql, (error, result) => {
        console.log("error: ", error)
        console.log("result: ", result)
        const isFollow = result[0].isFollow == 1;
        res.json(
            !error
            ? {success: true, message: '獲取是否跟蹤成功', result: isFollow} 
            : {success: false, message: '獲取是否跟蹤失敗', error: error}
        );
    });
});

// 點讚 ！用replace sql 更好
api.post('/tolike/post/:postID', (req, res) => {
    if (paramsCorrection(req.params, 'postID')) {
        return res.json({success: false, message: '參數不完整'});
    }
    const { postID } = req.params;
    // 存在時修改值
    sqlSelect(Table.Like, `username = '${req.decoded.username}' and postID = ${postID}`, '*', result => {
        if (result.success && result.result.length == 0) {
            sqlInsert(Table.Like, ['username', 'postID'], [req.decoded.username, postID], result => {
                res.json(
                    result.success
                    ? {success: true, message: '點讚成功'} 
                    : {success: false, message: '點讚失敗', error: result.error}
                );
            });
        } else if (result.success && result.result.length != 0) {
            res.json(
                result.success
                ? {success: true, message: '已經點讚了'} 
                : {success: false, message: '點讚失敗', error: result.error}
            )
        } else {
            res.json(result);
        }
    });
});


api.post('/unlike/post/:postID', (req, res) => {
    if (paramsCorrection(req.params, 'postID')) {
        return res.json({success: false, message: '參數不完整'});
    }
    const { postID } = req.params;
    sqlDelete(Table.Like, `username = '${req.decoded.username}' and postID = '${postID}'`, result => {
        res.json(
            result.success
            ? {success: true, message: '取消點讚成功'} 
            : {success: false, message: '取消點讚失敗', error: result.error}
        );
    });
});

app.post('/user/:username/islike/post/:postID', (req, res) => {
    // if (paramsCorrection(req.params, 'follower, following')) {
    //     return res.json({success: false, message: '參數不完整'});
    // }
    const { username, postID } = req.params;
    const sql = `select count(*)>0 as isLike from Likes where username = '${username}' and postID = ${postID}`;
    con.query(sql, (error, result) => {
        console.log("error: ", error)
        console.log("result: ", result)
        const isLike = result[0].isLike == 1;
        res.json(
            !error
            ? {success: true, message: '獲取是否跟蹤成功', result: isLike} 
            : {success: false, message: '獲取是否跟蹤失敗', error: error}
        );
    });
});


// 評論 ！可能需要返回commentID 用於修改評論
api.post('/post/:postID/comment/:text', (req, res) => {
    if (paramsCorrection(req.params, 'postID', 'text')) {
        return res.json({success: false, message: '參數不完整'});
    }
    const { postID, text } = req.params;
    sqlInsert(Table.Comment, ['username', 'postID', 'text'], [req.decoded.username, postID, text], result => {
        res.json(
            result.success
            ? {success: true, message: '評論成功'} 
            : {success: false, message: '評論失敗', error: result.error}
        );
    });
});

// 修改評論
api.get('/comment/modify', (req, res) => {
    if (paramsCorrection(req.query, 'commentID', 'text')) {
        return res.json({success: false, message: '參數不完整'});
    }
    const { commentID, text } = req.query;
    sqlUpdate(Table.Comment, `commentID = '${commentID}'`, 'text', text, result => {
        res.json(result);
    });
});

// 刪除評論
api.get('/deletecomment', (req, res) => {
    if (paramsCorrection(req.query, 'commentID')) {
        return res.json({success: false, message: '參數不完整'});
    }
    const commentID = req.query.commentID;
    sqlDelete(Table.Comment, `commentID = '${commentID}' and username = '${req.decoded.username}'`, result => {
        res.json(
            result.success
            ? {success: true, message: '刪除評論成功'} 
            : {success: false, message: '刪除評論失敗', error: result.error}
        );
    });
});

app.get('/:username/postcount', (req, res) => {
    if (paramsCorrection(req.query, 'username')) {
        return res.json({success: false, message: '參數不完整'});
    }
    const { username } = req.params;
    sqlAggregate(Table.Post, 'count', 'postID', 'postCount', `username = '${username}'`, result => {
        res.json(result);
    });
});

// ！ 應該放在app
// 跟蹤我的人數
app.get('/user/:username/followingcount', (req, res) => {
    sqlAggregate(Table.Follow, 'count', '*', 'followingCount', `following = '${req.params.username}'`, result => {
        console.log(result)
        res.json(result);
    });
});

// ！ 應該放在app
// 我跟蹤的人數
app.get('/user/:username/followercount', (req, res) => {
    sqlAggregate(Table.Follow, 'count', '*', 'followerCount', `follower = '${req.params.username}'`, result => {
        console.log(result)
        res.json(result);
    });
});

// 貼文數目
app.get('/user/:username/postcount', (req, res) => {
    sqlAggregate(Table.Post, 'count', '*', 'postCount', `username = '${req.params.username}'`, result => {
        console.log(result)
        res.json(result);
    });
});

// ！ 應該放在app
// 貼文的點讚人數
app.post('/post/:postID/likecount', (req, res) => {
    if (paramsCorrection(req.params, 'postID')) {
        return res.json({success: false, message: '參數不完整'});
    }
    const { postID } = req.params;
    sqlAggregate(Table.Like, 'count', '*', 'postLikeCount', `postID = ${postID}`, result => {
        result.result = result.result[0].postLikeCount
        res.json(result);
    });
});

// ！ 應該放在app
// 貼文的評論人數
app.get('/postcommentcount', (req, res) => {
    if (paramsCorrection(req.query, 'postID')) {
        return res.json({success: false, message: '參數不完整'});
    }
    const postID = req.query.postID;
    sqlAggregate(Table.Comment, 'count', '*', 'postCommentCount', `postID = ${postID}`, result => {
        res.json(result);
    });
});


// 增加一筆冰箱貼
api.post('/createpostit', upload.single('image'), uploadImage, async (req, res) => {
    // 這函數不能對body做檢查，因為 params.hasOwnProperty is not a function
    // if (paramsCorrection(req.body, 'label', 'count', 'remark')) {
    //     return res.json({success: false, message: '參數不完整'});
    // }
    const url = req.url;
    const { label, count, remark } = req.body;
    try {
        await sqlInsert(Table.PostIt, ['username', 'label', 'count', 'remark', 'image'], [req.decoded.username, label, count, remark, url], result => {
            return res.json(
                result.success 
                ? {success: true, message: '成功增加一筆冰箱貼'} 
                : {success: false, message: '增加冰箱貼失敗', error: result.error}
            );
        });
    } catch (error) {
        console.log('Error: ', error);
    }
});

// 刪除一筆冰箱貼
api.get('/deletepostit', (req, res, next) => {
    if (paramsCorrection(req.query, 'postItID')) {
        return res.json({success: false, message: '參數不完整'});
    }
    const postItID = req.query.postItID;
    console.log('postItID : ', postItID)
    // ！ 獲取 image 的 url 的 imageID 傳給 deleteImage
    sqlSelect(Table.PostIt, `postItID = ${postItID}`, 'image', result => {
        if (result.success && result.result.length != 0) {
            // ！ 只能處理自己伺服器的圖片路徑，可能允許上傳地址
            req.imageID = result.result[0].image.match(/([0-9]+)$/)[0];
            if (req.imageID == undefined) {
                return res.json({success: false, message: 'image 的 url 不正確'});
            }
        } else {
            return res.json(result);
        }
        console.log('req.imageID: ', req.imageID);
        // 刪除 postIt
        sqlDelete(Table.PostIt, `postItID = ${postItID}`, result => {
            if (result.success) {
                next()
            } else {
                res.json({success: false, message: `刪除 postItID 為${postItID}失敗`, error: result.error});
            }
        });
    });
}, deleteImage, (req, res) => {
    res.json({success: true, message: `刪除 postItID 為 ${req.query.postItID} 成功`});
});

// 修改一筆冰箱貼資料
api.get('/updatepostit', (req, res) => {
    if (paramsCorrection(req.query, 'postItID', 'option', 'value')) {
        return res.json({success: false, message: '參數不完整'});
    }
    const { postItID, option, value } = req.query;
    // 可修改項目
    const options = ['label', 'image', 'count', 'remark', 'hidden', 'information'];
    if (!options.includes(req.query.option)) {
        return res.json({success: false, message: '沒有該修改項目'});
    }
    sqlUpdate(Table.PostIt, `postItID = ${postItID}`, option, value, result => {
        res.json(result);
    });
});

// 獲取全部冰箱貼
api.post('/getpostit', (req, res) => {
    const sql1 = `select * from PostIt where username = '${req.decoded.username}' order by create_time desc`;
    con.query(sql1, (error1, result) => {
        if (!error1) {
            const labels = result.map(element => element.label);
            console.log('labels: ', labels);
            const sql2 = `select * from ModelData where label in('${labels.join("', '")}')`;
            con.query(sql2, (error2, modelData) => {
                if (!error2) {
                    let map = {};
                    for (let i = 0; i < modelData.length; i++) {
                        map[modelData[i].label] = modelData[i];
                    }
                    console.log('modelData: ', modelData);
                    for (let i = 0; i < result.length; i++) {
                        result[i].modelData = map[result[i].label];
                    }
                    console.log('max result: ', result);
                    res.json({success: true, message: "", result: result});
                } else {
                    console.log(error2);
                    res.json({success: false, message: "", error: error2});
                }
            });
        } else {
            return res.json({success: false, message: "", error: error1})
        }
    });
    
    // sqlSelect(Table.PostIt, `username = '${req.decoded.username}'`, '*', result => {
    //     if (result.success) {
    //         const labels = result.result.map(element => element.label);
    //         console.log('labels: ', labels);
    //         const sql = `select * from ModelData where label in('${labels.join("', '")}')`;
    //         con.query(sql, (error, modelData) => {
    //             if (!error) {
    //                 let map = {};
    //                 for (let i = 0; i < modelData.length; i++) {
    //                     map[modelData[i].label] = modelData[i];
    //                 }
    //                 console.log('modelData: ', modelData);
    //                 for (let i = 0; i < result.result.length; i++) {
    //                     result.result[i]['modelData'] = map[result.result[i].label];
    //                 }
    //                 console.log('max result: ', result);
    //                 res.json(result);
    //             } else {
    //                 console.log(error);
    //             }
    //         });
    //     }
    // });
});

// 上傳圖片
// ！這可能沒有用了
api.post('/uploadimage', upload.single('image'), async (req, res) => {
    console.log('file => ', req.file);
    const base64Image = req.file.buffer.toString('base64');
    console.log("base64Image", base64Image);
    try {
        await sqlInsert('Image', ['image'], base64Image, result => {
            res.json(result);
        });
    } catch (error) {
        console.log('Error: ', error);
    }
});

// 獲取圖片
// ！ 應該分開公開和私人
app.get('/:username/image/:imageID', (req, res) => {
    if (paramsCorrection(req.params, 'username', 'imageID')) {
        return res.json({success: false, message: '參數不完整'});
    }
    const { username, imageID } = req.params;
    sqlSelect('Image', `username = '${username}' and imageID = ${imageID}`, 'image', result => {
        if (result.result.length) {
            const base64Image = Buffer.from(result.result[0].image.toString(), 'base64');
            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Length': base64Image.length
            });
            return res.end(base64Image);
        } else {
            res.json({success: false, message: "圖片加載錯誤"});
        }
    });
});


// 商店 發文
api.post('/createshoppost', upload.single('images'), uploadImage, (req, res) => {
    sqlInsert('Shop',['username', 'images', 'title', 'cost', 'introduction', 'type'], [req.body.username, req.url, req.body.title, req.body.cost, req.body.introduction, req.body.type], result => {
        res.json(result);
    });
});

app.post('/foodtype', (req, res) => {
    const sql = 'select foodType from FoodType order by foodType desc'
    con.query(sql, (error, result) => {
        res.json(
            !error 
            ? {success: true, message: "獲取商品類別成功", result: result}
            : {success: false, message: "獲取商品類別失敗", error: error}
        );
    });
    // sqlSelect('FoodType', undefined, '*', result => {
    //     res.json(result);
    // });
});

app.post('/getshoppost', (req, res) => {
    const sql = `select * from Shop ${req.body.type === '全部' ? undefined : 'where type = \'' + req.body.type + '\''} order by create_time desc`
    con.query(sql, (error, result) => {
        res.json(
            !error 
            ? {success: true, message: "獲取商品貼文成功", result: result}
            : {success: false, message: "獲取商品貼文失敗", error: error}
        );
    });

    // sqlSelect('Shop', req.body.type === '全部' ? undefined : `type = '${req.body.type}'`, '*', result => {
    //     console.log(result)
    //     res.json(result);
    // });
});

app.post('/getmodeldata', (req, res) => {
    sqlSelect('ModelData', `label = '${req.body.label}'`, '*', result => {
        result.result = result.result[0];
        console.log(result)
        res.json(result);
    });

    // const labels = Array.isArray(req.body.label) ? labels.join("', '") : req.body.label;
    // const sql =  `select * from ModelData where label in('${labels}')`
    // con.query(sql, (error, result) => {
    //     res.json(
    //         !error
    //         ? {success: true, message: "獲取模型資訊成功", result: result} 
    //         : {success: false, message: "獲取模型資訊失敗", error: error}
    //     );
    // });
});


// api掛在app之後
app.use('/api', api);


// 伺服器開啟聆聽
httpServer.listen(port, () => console.log(`listening on *:${port}`));
// httpServer.listen(port, () => console.log(`listening on *:${port}`, `http://localhost:${port}`));

/** 加密 */
// 轉hash
const hashCode = s => s.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0);


/** SQL Function */
// 從數據庫獲取數據
function getData(table, column, value, callback) {
    var mark = typeof(value) === 'string' ? "\'" : "";
    var sql = "select * from " + table + " where " + column + " like " + mark + value + mark;
    con.query(sql, (error, results) => {
        const res = !error 
        ? {success: true, message: '獲取數據成功', result: results} 
        : {success: false, message: '獲取數據失敗', error: error}
        console.log('客戶端獲取數據 - 成功');
        callback(res);
    });
}

// 註冊
function signUp(username, password, email, avatar, userType, callback) {
    const hashPassword = hashCode(password);
    const sql = `insert into ${Table.User} (username, password, email, avatar, userType) values ( "${[username, hashPassword, email, avatar, userType].join('", "')}")`;
    con.query(sql, error => {
        const res = !error 
        ? {success: true, message: '註冊成功'}
        : {success: false, message: '註冊失敗', error: error}
        console.log(res);
        callback(res);
    });
}

// 驗證用戶
function verifyUser(username, password, callback) {
    const hashPassword = hashCode(password);
    const sql = `select password from ${Table.User} where username = ?`; 
    con.query(sql, [username], (error, results) => {
        const res = !error 
        ? results.length == 0 
        ? {success: false, message: "此用戶名不存在"} 
        : results[0].password == hashPassword 
        ? {success: true, message: "驗證成功"} 
        : {success: false, message: "密碼錯誤"} 
        : {success: false, message: "資料庫出錯", error: error};
        callback(res);
        // if (!err) {
        //     if (results.length == 0) {
        //         callback({err: 1, msg: "此用戶名不存在"});
        //     } else if (results[0].password == password) {
        //         callback({err: 0, msg: "登陸成功"});
        //     } else {
        //         callback({err: 1, msg: "密碼錯誤"});
        //     }
        // } else {
        //     callback({err: 1, msg: "資料庫出錯"});
        // }
    });
}

// 判斷用戶名是否已存在
function isUnusedUsername(username, callback) {
    sqlSelect(Table.User, `username = '${username}'`, 'username', result => {
        var res = result.success 
        ? result.result.length == 0 
        ? {success: true, message: '此用戶名稱還沒被註冊', isUnused: true} 
        : {success: true, message: '此用戶名稱已被註冊', isUnused: false} 
        : result
        callback(res);
    });
}

// 上傳圖片
function uploadImage(req, res, next) {
    const username = req.decoded.username;
    // ！ 可能要檢查image是否有上傳到伺服器
    console.log(req.file.buffer != undefined);
    const base64Image = req.file.buffer.toString('base64');
    console.log('file => ', req.file);
    const sql = `insert into Image set ?`;
    con.query(sql, { username: username, image: base64Image }, (error, result) => {
        if (error) {
            return res.json({ success: false, error: error });
        } else {
            req.url = `${username}/image/${result.insertId}`;
            console.log('Image url: ', req.url);
            next()
        }
    });
}

function uploadImageWithoutToken(req, res, next) {
    const { username } = req.body;
    // ！ 可能要檢查image是否有上傳到伺服器
    console.log(req.file.buffer != undefined);
    const base64Image = req.file.buffer.toString('base64');
    console.log('file => ', req.file);
    const sql = `insert into Image set ?`;
    con.query(sql, { username: username, image: base64Image }, (error, result) => {
        if (error) {
            return res.json({ success: false, error: error });
        } else {
            req.url = `${username}/image/${result.insertId}`;
            console.log('Image url: ', req.url);
            next()
        }
    });
}


// 刪除圖片 - 需要接收imageID
function deleteImage(req, res, next) {
    const username = req.decoded.username;
    const imageID = req.imageID;
    sqlDelete('Image', `username = '${username}' and imageID = ${imageID}`, result => {
        if (result.success) {
            console.log(username, " 成功刪除 imageID 為 ", imageID, " 的圖片");
            next()
        } else {
            res.json(result);
        }
    });
}

function updateImage(req, res, next) {
    const username = req.decoded.username;
    const imageID = req.imageID;
    const base64Image = req.file.buffer.toString('base64');
    console.log('file => ', req.file);
    sqlUpdate('Image', `username = '${username}' and imageID = ${imageID}`, 'image', base64Image, result => {
        if (result.success) {
            console.log(username, " 成功更新 imageID 為 ", imageID, " 的圖片");
            res.json(result);
        } else {
            res.json(result);
        }
    });
}

function forgetPassword() {
    
}

// function getPost(username, callback) {
//     const sql = `select post from Post where username like '${username}'`;
//     con.query(sql, (err, results) => {
//         const res = !err 
//         ? results.length == 0 
//         ? {err: 1, msg: "沒有任何貼文"} 
//         : results 
//         : {err: 1, msg: "資料庫出錯"};
//         callback(res);
//     });
// }

function sqlInsert(table, column, value, callback) {
    if (Array.isArray(column)) column = column.join(', ');
    if (Array.isArray(value)) value = value.join('\', \'');
    const sql = `insert into ${table} (${column}) values ('${value}')`;
    con.query(sql, error => {
        const res = !error
        ? {success: true, message: 'insert success'}
        : {success: false, message: 'insert failure', error: error};
        console.log(res);
        callback(res);
    });
}

function sqlDelete(table, conditions, callback) {
    const sql = `delete from ${table} where ${conditions}`;
    con.query(sql, error => {
        const res = !error
        ? {success: true, message: 'delete success'}
        : {success: false, message: 'delete failure', error: error};
        console.log(res);
        callback(res);
    });
}

function sqlUpdate(table, conditions, setColumn, setValue, callback) {
    const afterWhere = conditions != undefined ? `where ${conditions}` : '';
    const sql = `update ${table} set ${setColumn} = '${setValue}' ${afterWhere}`;
    con.query(sql, error => {
        const res = !error 
        ? {success: true, message: 'update success'} 
        : {success: false, message: 'update failure', error: error};
        console.log(res);
        callback(res);
    });
}

function sqlSelect(table, conditions, select, callback) {
    if (Array.isArray(select)) select = select.join(', ');
    const afterWhere = conditions != undefined ? `where ${conditions}` : '';
    const sql = `select ${select} from ${table} ${afterWhere}`;
    con.query(sql, (error, result) => {
        const res = !error 
        ? {success: true, message: 'select success', result: result} 
        : {success: false, message: 'select failure', error: error};
        console.log(res);
        callback(res);
    });
}

function sqlAggregate(table, AggregateFunction, column, as, conditions, callback) {
    const afterWhere = conditions != undefined ? `where ${conditions}` : '';
    const sql = `select ${AggregateFunction}(${column}) as ${as} from ${table} ${afterWhere}`;
    con.query(sql, (error, result) => {
        const res = !error
        ? {success: true, message: 'count success', result: result} 
        : {success: false, message: 'count failure', error: error};
        console.log(res);
        callback(res);
    });
}

const usernameRuleCN = /^[A-Za-z0-9\u4e00-\u9fa5_.]{2,16}$/;
const usernameRuleLikeIG = /^[a-zA-Z0-9_]{3,16}$/;
const passwordRule = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,18}$/;
const passwordRuleWithoutUppercaseLetter = /^(?=.*\d)(?=.*[a-z]).{6,18}$/;
const emailRule = /^\w+((-\w+)|(\.\w+)|(\+\w+))*\@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z]+$/;




/*
大寫名稱：table名稱
!：不能null
?：可無
:pk：主鍵
->：外鍵
()：還不確定要不要
*/
// SQL數據結構
// User: name!:pk password! email! emailVerifie? date! avatar? introduction? (setting?) 

// 共用資料
// Post: postID!:pk name!->User.name image? content! date! comment? 
// Like: id!:pk name!->User.name postID->Post.postID (date)
// Follow: id!:pk name!->User.name followerName!->User.name (date)
// Comment: commentID!:pk postID!->Post.postID name!->User.name content! date!

// 名稱存取PostIt伺服器都要驗證 
// PostIt: postItID!:pk name!->User.name object! count! date! bestBefore? remark? hidden?

// 神經網路模型所對應之資料庫，用以獲取食物額外資料
// ModelData: id!:pk label! content? 