import request from 'supertest';
import chai from 'chai';
chai.should();
import { app } from '../main';
let stat: number;
let tknLogin: string;
let user_email: string;
let workspace_id: string;
let channel_id: string;
let message_id: string;
let tempTkn:string;

let login = async () => {
    let { body: { token } } = await request(app).post('/auth/login').set({
        email: 'test@test.test',
        password: 'test'
    }).set('Accept', 'application/json');
    tknLogin = token;
}

let logWithParams = async(email:string, password:string) => {
    let {body:{token}} = await request(app).post('/auth/login')
        .set({email,password})
    tempTkn = token;
}

let logout = async () => {
    await request(app).delete('/auth/logout').set({
        tkn: tknLogin
    });
    tknLogin = '';
    stat = 0;
}

let register = async (username: string, email: string, password: string) => {
    await request(app).post('/auth/register').send({
        username,
        email,
        password
    });
}

let deleteUser = async (email: string) => {
    await request(app).delete('/auth/user').set({
        email
    })
}

let getEmail = async () => {
    let { body } = await request(app).get('/auth/email')
        .set({ tkn: tknLogin });
    user_email = body;
}

let joinWorkspace = async(tkn:string) => {
    workspace_id = "VfuvFyLpm6HoPP1Bp99Z9N"
    await request(app).post('/home/join/workspace').set({
        tkn,
        workspace_id
    });
}

let createChannel = async () => {
    let { status, body: { channelId } } = await request(app).post('/workspaces/channels')
        .set({ workspace_id, tkn: tknLogin })
        .send({ channelName: 'provaCanale', privacy: true });
    stat = status;
    channel_id = channelId;
}

let deleteChannel = async () => {
    let { status } = await request(app).delete('/workspaces/channels')
        .set({ tkn: tknLogin, workspace_id, channel_id })
    stat = status;
    channel_id = '';
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

let leaveChannel = async(id:string) => {
    let { status } = await request(app).delete('/channels/leave').set({
        user_email,
        channel_id: id
    })
    stat = status;
}

let createMessage = async () => {
    let { status, body: { messageId } } = await request(app).post('/channels/messages').set({
        channel_id,
        user_email
    }).send({
        content: "messaggio lezzo di nello taver"
    })
    stat = status
    message_id = messageId
}

let deleteMessage = async () => {
    let { status } = await request(app).delete('/channels/messages').set({
        tkn: tknLogin,
        channel_id,
        message_id
    })
    stat = status
}

let leaveWorkspace = async() => {
    await request(app).delete('/workspaces/leave').set({
        tkn: tknLogin,
        workspace_id
    });
}


describe('API Channel', () => {
    describe('Get calls', () => {
        before(login);
        before(createWorkspace);
        before(createChannel);
        before(getEmail)
        after(deleteChannel)
        after(deleteWorkspace);
        after(logout)
        it('Get channel name', async() => {
            let { status } = await request(app).get('/channels/').set({channel_id});
            status.should.equal(200);
        }); 

        it('Get channel name with incorrect channel_id', async() => {
            let { status } = await request(app).get('/channels/').set({channel_id: 'idrandomprovaa'});
            status.should.equal(404);
        });

        it('Get all messages', async() => {
            let { status } = await request(app).get('/channels/messages').set({channel_id});
            status.should.equal(200);
        }); 
        
        it('Get all users',async()=>{
            let {status} = await request(app).get('/channels/users').set({
                channel_id
            })
            status.should.equal(200)
        })
        
        it('Get username',async()=>{
            let {status} = await request(app).get('/channels/users/user').set({
                user_email
            })
            status.should.equal(200)
        })
        
        it('Get username with a wrong email',async()=>{
            let {status} = await request(app).get('/channels/user').set({
                user_email:"tavernello@gmail.com"
            })
            status.should.equal(404)
        })

    })

    describe('Post calls', () => {
        before(login);
        before(createWorkspace);
        before(createChannel);
        before(getEmail);
        after(deleteChannel);
        after(deleteWorkspace);
        after(logout);
        it('Send message to channel', async () => {
            await createMessage();
            stat.should.equal(200);
            await deleteMessage();
        }) 

        it('Send an empty message',async()=>{
            let {status} = await request(app).post('/channels/messages').set({
                channel_id,
                user_email
            }).send({
                content:""
            })
            status.should.equal(400)
        })
            
        it('Reply message',async()=>{
            await createMessage()
            let {status} = await request(app).post('/channels/messages/replies').set({
                user_email,
                message_id
            }).send({
                content:"(sto replicando al mio stesso messaggio)"
            })
            status.should.equal(200)
            await deleteMessage()
        })
            
        it('Reply with an empty message',async()=>{
            await createMessage();
            let {status} = await request(app).post('/channels/messages/replies').set({
                user_email,
                message_id
            }).send({
                content:""
            })
            status.should.equal(400)
            await deleteMessage();
        })
    })

    describe('Put calls', () => {
        before(login);
        before(async() => await joinWorkspace(tknLogin))
        before(createChannel);
        before(async() => await register('gigi', 'gigi@proietti.it', '12345'))
        before(async() => await logWithParams('gigi@proietti.it', '12345'))
        before(async() => await joinWorkspace(tempTkn))
        before(async() => await register('Angioletto', 'angioletto@freestyle.it', '12345'))
        before(async() => await logWithParams('angioletto@freestyle.it', '12345'))
        before(async() => await joinWorkspace(tempTkn))
        after(deleteChannel);
        after(logout);
        after(async() => await deleteUser('gigi@proietti.it'))
        after(async() => await deleteUser('angioletto@freestyle.it'))
        it('Add user to channel', async () => {
            let { status } = await request(app).put('/channels/add').set({
                to_add: 'gigi@proietti.it',
                channel_id,
                workspace_id,
            });
            status.should.equal(200);
        }); 

        it('Add more users to channel', async () => {
            let { status } = await request(app).put('/channels/add').set({
                to_add: "gigi@proietti.it,angioletto@freestyle.it",
                channel_id,
                workspace_id,
            });
            status.should.equal(200);
        });
    })

    describe('Delete calls', () => {
        before(login);
        before(async() => await joinWorkspace(tknLogin))
        before(getEmail)
        before(createChannel)
        after(deleteChannel)
        after(leaveWorkspace)
        after(logout);
        it('Leave channel', async () => {
            await leaveChannel("9xZSha8KT9FEQnmY79AM9k")
            stat.should.equal(200)
        })
        
        it('Delete message', async () => {
            await createMessage()
            await deleteMessage()
            stat.should.equal(200)
        })
    })
})

