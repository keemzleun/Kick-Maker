const path = require("path");
const fs = require('fs');
const team = require("../models/Team");
const review = require("../models/TeamReview");
const jwt = require('jsonwebtoken');
const secretKey = require('../config/secretkey').secretKey;
const options = require('../config/secretkey').options;

module.exports= {
    loginview : (req, res) => {
        team.getAllTeam(function( result ) {
            res.render(path.join(__dirname + '/../views/signin.ejs'), {
                title: "testtitle",
                Team: result
            });
            //console.log(result);
        });  
    },

    login_process : (req, res) => {
        team.getLoginTeam(req.body.id,req.body.password,function( result ) {
            if(result==null){
                login_fail();
            } else {
                payload = result.user_id;
                login_success();
            }
        });        
        //실패시 실패알람코드 추가필요
        function login_fail () {   
            res.write("<script>alert('로그인에 실패하였습니다.')</script>");
            res.write("<script>window.location=\"/signin\"</script>");
            res.end();
        }

        function login_success () {
            token = jwt.sign(payload,secretKey,options);  
            res.cookie('usertoken',token)
            res.redirect('/')
        }
    },

    logout : (req, res) => {
        res.cookie('usertoken', null, {
            maxAge: 0,
        });
        res.redirect('/')
    },
    
    edit_team: async (req, res) => {
        try {
            // {
            // id: 'gangdong',
            // password: '2222',
            // teamname: 'FC강동',
            // represent_name: '허이구',
            // hp: '010-2222-2222'
            // }

            const result = await new Promise((resolve) => {
                team.getOneTeam(req.user_id, resolve);
            });

            //파일이 있는 경우
            if (req.file.filename != null) {
                var new_image = req.file.filename;
                var old_image = result.logo_image;

                if (old_image != 'default.jpg') {
                    console.log(old_image);
                    fs.unlink(`../files/${old_image}`, err => {
                        if (err.code == 'ENOENT') {
                            console.log("파일 삭제 Error 발생");
                        }
                    });
                }
                req.body.logo_image = new_image;
            } else if (req.file.filename == null) {
                req.body.logo_image = old_image;
            }

            

            team.updateTeam(req.body, req.user_id, function (result) {
                console.log(req.body);
                res.cookie('usertoken', null, {
                    maxAge: 0,
                });
                res.redirect('/');
            });
        } catch (error) {
            console.error(error);
            // Handle error response
        }
    },


    team_review: (req, res) => {

        var result = new Object();
        var manner = new Object();

        // team에다가 +3 +1 +0 반영하기, 매너점수 반영하기 
        // { result: '승리', manner_rate: '나쁨' }
        switch (req.body.result) {
            case '승리':
                result.result = `totalMatches = totalMatches+1, win_score = win_score+3, win = win+1 `
                break;
            case '무승부':
                result.result = `totalMatches = totalMatches+1, win_score = win_score+1, draw = draw+1 `
                break;
            case '패배':
                result.result = `totalMatches = totalMatches+1, win_score = win_score+0, lose = lose+1 `
                break;
        }

        switch (req.body.manner_rate) {
            case '매우 좋음':
                manner.result = `manner_score = manner_score + 2 `;
                break;
            case '좋음':
                manner.result = `manner_score = manner_score + 1 `;
                break;
            case '보통':
                manner.result = `manner_score = manner_score + 0 `;
                break;
            case '나쁨':
                manner.result = `manner_score = manner_score - 1 `;
                break;
            case '매우 나쁨':
                manner.result = `manner_score = manner_score - 2 `;
                break;
        }
        console.log(req.body.opponent_id);
        console.log(result);
        //req.params.pageId로 상대 정보 가져오고, 그 아이디에 
        team.updateAfterMatch(manner, req.body.opponent_id, function (back2) {
            team.updateAfterMatch(result, req.user_id, function (back) {
                review.insertTeamReview(req.params.pageId, req.user_id, req.body.result, req.body.manner_rate, function (result) {
                    res.redirect('/my-match');
                });
            });
        });
    },
}
