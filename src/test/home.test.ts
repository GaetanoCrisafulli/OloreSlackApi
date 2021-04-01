import request from 'supertest';
import chai from 'chai';
chai.should();
import { app } from '../main';
let stat:number;
let tknLogin:string;
let workspace_id:string;

let login = async() => {
    let {body:{token}} = await request(app).post('/auth/login').set({
        email: 'test@test.test',
        password: 'test'
    }).set('Accept', 'application/json');
    tknLogin = token;
}

let logout = async() => {
    await request(app).delete('/auth/logout').set({
        tkn: tknLogin
    });
    tknLogin = '';
    stat = 0;
}

let createWorkspace = async() => {
    let { status, body:{workspaceId} } = await request(app).post('/home/workspace')
            .set({tkn: tknLogin})
            .send({name: 'Workspace118'});
    stat = status;
    workspace_id = workspaceId;
}

let deleteWorkspace = async() => {
    let { status, body } = await request(app).delete('/workspaces/')
            .set({tkn: tknLogin, workspace_id})
    stat = 0;
    workspace_id = '';
}

let joinWorkspace = async() => {
    let { status } = await request(app).post('/home/join/workspace').set({
        tkn: tknLogin,
        workspace_id: 'VRMNGEw3uYkgQfufAW8BFb'
    });
    stat = status;
}

let leaveWorkspace = async() => {
    let { status } = await request(app).delete('/workspaces/leave').set({
        tkn: tknLogin,
        workspace_id: 'VRMNGEw3uYkgQfufAW8BFb'
    });
    stat = status;
}

describe('API Home', () => {
    describe('Get calls',() =>{
        before(login);
        after(logout);
        it('Get All Workspaces', async ()=>{
            let {status} = await request(app).get('/home/workspaces').set({
                tkn:tknLogin
            })
            status.should.equal(200)
        })

    }) 

    describe('Post calls', () => {
        before(login);
        after(logout);
        it('Create workspace', async() => {
            await createWorkspace();
            stat.should.equal(200);
            await deleteWorkspace();
        });

        it('Join workspace', async () => {
            await joinWorkspace();
            stat.should.equal(200);
            await leaveWorkspace();
        });
        
        it('Join workspace with incorrect workspace_id', async () => {
            let { status } = await request(app).post('/home/join/workspace').set({
                tkn: tknLogin,
                workspace_id: 'VRMNGEw3uYkgQfufAW8BFcaa'
            });
            status.should.equal(404);
        });

        it('Join workspace with already existent user', async () => {
            let { status } = await request(app).post('/home/join/workspace').set({
                tkn: '9Giec8p7JuBYu3e5Qux58h',
                workspace_id: 'Prova1'
            });
            status.should.equal(400);
        });  
    })
})