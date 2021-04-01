import request from 'supertest';
import chai from 'chai';
chai.should();
import { app } from '../main';
let stat:number;
let tknLogin:string;

let register = async() => {
    let { status } = await request(app).post('/auth/register').send({
        username: 'Registrazione utente',
        email: 'registrazione@utente.it',
        password: '12345'
    });
    stat = status;
}

let deleteUser = async() => {
    let { status } = await request(app).delete('/auth/user').set({
        email:"registrazione@utente.it"
    })
    stat = status;
}

let login = async() => {
    let {status, body:{token}} = await request(app).post('/auth/login').set({
        email: 'test@test.test',
        password: 'test'
    }).set('Accept', 'application/json');
    stat = status
    tknLogin = token;
}

let logout = async() => {
    let { status } = await request(app).delete('/auth/logout').set({
        tkn: tknLogin
    });
    stat = status;
    tknLogin = '';
}

describe('API Auth', () => {
    describe('Get calls', () => {
        it('Get users', async () => {
            let { status } = await request(app).get('/auth/users').set('Accept', 'application/json');
            status.should.equal(200);
        });

        before(login);
        after(logout);
        it('Get user email', async () => {
            let { status } = await request(app).get('/auth/email').set({tkn: tknLogin}).set('Accept', 'application/json');
            status.should.equal(200);
        });

        it('Get user email with incorrect token', async () => {
            let { status } = await request(app).get('/auth/email').set({tkn: '5aXi4rcFzxKgRVmuuZSC18'}).set('Accept', 'application/json');
            status.should.equal(404);
        });
    })

    describe('Post calls', () => {
        before(login);
        before(register);
        after(logout);
        after(deleteUser);

        it('Login', () => {
            stat.should.equal(200);
        });
        
        it('Login with incorrect password', async() => {
            let { status } = await request(app).post('/auth/login').set({
                email: 'nellotaver@gmail.com',
                password: '12345'
            }).set('Accept', 'application/json');
            status.should.equal(400);
        });

        it('Login with not existent', async() => {
            let { status } = await request(app).post('/auth/login').set({
                email: 'email@non.esistente',
                password: 'tavernello'
            }).set('Accept', 'application/json');
            status.should.equal(404);
        });

        it('Register', () => {
            stat.should.equal(200);
        });
        
        it('Register with email already existing', async() => {
            let { status } = await request(app).post('/auth/register').send({
                username: 'Gskianto',
                email: 'maestro@gskianto.na',
                password: 'entronelparchetto'
            });
            status.should.equal(400);
        });
    })

    describe('Delete calls',()=>{
        before(login);
        before(register);
        it('Logout',async()=>{
            logout();
            stat.should.equal(200);
        });

        it('Logout error',async()=>{
            let { status } = await request(app).delete('/auth/logout').set({
                tkn:"test1"
            });
            status.should.equal(418);
        });

        it('Delete user',async()=>{
            deleteUser();
            stat.should.equal(200);
        });

        it('Delete user with invalid token',async()=>{
            let {status} = await request(app).delete('/auth/user').set({
                email:"email@nonesistente.com"
            })
            status.should.equal(404)
        })
    })
})