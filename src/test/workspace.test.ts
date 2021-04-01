import request from 'supertest';
import chai from 'chai';
chai.should();
import { app } from '../main';
let stat:number;
let tknLogin:string;
let workspace_id:string;
let channel_id:string;

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
    let { status } = await request(app).delete('/workspaces/')
            .set({tkn: tknLogin, workspace_id})
    stat = status;
    workspace_id = '';
}

let joinWorkspace = async() => {
    let { status } = await request(app).post('/home/join/workspace').set({
        tkn: tknLogin,
        workspace_id: 'VRMNGEw3uYkgQfufAW8BFb'
    });
    stat = status;
}

let createChannel = async() => {
    let { status, body:{channelId}} = await request(app).post('/workspaces/channels')
        .set({workspace_id, tkn: tknLogin})
        .send({channelName: 'provaCanale', privacy: true});
    stat = status;
    channel_id = channelId;
}

let deleteChannel = async() => {
    let { status } = await request(app).delete('/workspaces/channels')
        .set({tkn: tknLogin, workspace_id, channel_id})
    stat = status;
    channel_id = '';
}

describe('API Workspace', () => {
    describe('Get calls', () => {
        before(login);
        before(createWorkspace);
        after(deleteWorkspace);
        after(logout);
        it('Get workspace name', async () => {
            let { status } = await request(app).get('/workspaces/').set({workspace_id});
            status.should.equal(200);
        });

        it('Get workspace name with incorrect id', async () => {
            let { status } = await request(app).get('/workspaces/').set({workspace_id: 'VRMNGEw3uYkgQfufAW8BFc'});
            status.should.equal(404);
        })

        it('Get all channels in the workspace', async() => {
            let { status } = await request(app).get('/workspaces/channels').set({workspace_id});
            status.should.equal(200); 
        })

        it('Get all users in the workspace', async()=>{
            let { status } = await request(app).get('/workspaces/users').set({
                workspace_id
            });
            status.should.equal(200); 
        })
    })  

    describe('Post calls',()=>{
        before(login);
        before(createWorkspace);
        after(deleteWorkspace);
        after(logout);
        it('Create channel', async()=>{
            await createChannel();
            stat.should.equal(200); 
            await deleteChannel()
        })
    }) 

    describe('Delete calls', () => {
        before(login);
        before(createWorkspace);
        after(deleteWorkspace);
        after(logout);
        it('Leave workspace', async () => {
            let { status } = await request(app).delete('/workspaces/leave').set({
                tkn: tknLogin,
                workspace_id
            });
            status.should.equal(200);
        });

        it('Leave workspace with incorrect user', async () => {
            let { status } = await request(app).delete('/workspaces/leave').set({
                tkn: '5aXi4rcFzxKgRVmuuZSC18',
                workspace_id
            });
            status.should.equal(400);
        }); 

        it('Leave workspace with incorrect workspace_id', async () => {
            let { status } = await request(app).delete('/workspaces/leave').set({
                tkn: tknLogin,
                workspace_id: 'Prova11'
            });
            status.should.equal(404);
        }); 

        it('Delete channel', async()=>{
            await createChannel();
            await deleteChannel();
            stat.should.equal(200);
        }) 
         
        it('Delete channel with channel not found', async()=>{
            let { status } = await request(app).delete('/workspaces/channels').set({
                tkn: tknLogin,
                workspace_id,
                channel_id: 'channel_id a caso'
            });
            status.should.equal(404);
        })
    }) 
})