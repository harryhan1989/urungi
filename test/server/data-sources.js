const { app, encrypt, decrypt } = require('../common');

const chai = require('chai');
const expect = chai.expect;

var agent = chai.request.agent(app);

var DataSources = connection.model('DataSources');

async function seed () {
    const entries = [
        new DataSources(
            {
                companyID: 'COMPID',
                name: 'dummy db',
                type: 'MySQL',
                status: 1,
                params: [{
                    packetSize: 500,
                    connection: {
                        database: 'non_existent_db',
                        host: 'localhost'
                    }
                }],
                nd_trash_deleted: false
            }
        ),
        new DataSources(
            {
                companyID: 'COMPID',
                name: 'sql db',
                type: 'MySQL',
                status: 1,
                params: [{
                    packetSize: 500,
                    connection: {
                        database: 'will_need_to_be_created',
                        host: 'localhost'
                    }
                }]
            }
        )
    ];

    for (var entry of entries) {
        await entry.save();
    }

    return entries;
};

function verifyItem (item) {
    expect(item).to.have.property('_id');
    expect(item).to.have.property('companyID');
    expect(item).to.have.property('name');
    expect(item).to.have.property('type');
    expect(item).to.have.property('status');
    expect(item).to.have.property('nd_trash_deleted');
    expect(item).to.have.property('__v');
    expect(item).to.have.property('params');
};

async function authentifyAgent (agent) {
    const res = await agent.post('/api/login')
        .send(encrypt({ userName: 'administrator', password: 'widestage' }));
    expect(res).to.have.status(200);
}

async function getValidID (agent, index) {
    if (!index) {
        index = 0;
    }

    var res = await agent.get('/api/data-sources/find-all');
    expect(res).to.have.status(200);
    return decrypt(res.text).items[index]._id;
};

async function testUnidentifiedConnection (agent, url) {
    it('should return status 401', async function () {
        var res = await chai.request(app).get(url);
        expect(res).to.have.status(401);
    });
}

describe('/api/data-sources', function () {
    let entries;
    before(async function () {
        entries = await seed();
    });

    after(async function () {
        agent.close();
        for (const entry of entries) {
            await entry.remove();
        }
    });

    describe('/api/data-sources/find-all', function () {
        testUnidentifiedConnection(agent, '/api/data-sources/find-all');

        it('should return all data sources', async function () {
            await authentifyAgent(agent);

            var res = await agent.get('/api/data-sources/find-all');
            expect(res).to.have.status(200);
            var decrypted = decrypt(res.text);

            expect(decrypted).to.be.a('object');
            expect(decrypted).to.have.property('result');
            expect(decrypted).to.have.property('page');
            expect(decrypted).to.have.property('pages');
            expect(decrypted.items).to.be.a('array');

            expect(decrypted.items).to.have.lengthOf(1);
            // We cannot expect the length to be equal to 2,
            // because other simultaneous tests may add entries to the database
            verifyItem(decrypted.items[0]);
        });
    });

    describe('api/data-sources/find-one', function () {
        testUnidentifiedConnection(agent, '/api/data-sources/find-one');

        it('should find no valid item', async function () {
            await authentifyAgent(agent);

            var res = await agent.get('/api/data-sources/find-one');
            expect(res).to.have.status(200);
            var decrypted = decrypt(res.text);
            expect(decrypted).to.have.property('result');
            expect(decrypted.result).to.equal(0);
        });

        it('should find a single valid item', async function () {
            await authentifyAgent(agent);

            const entryID = await getValidID(agent, 0);

            var res = await agent.get('/api/data-sources/find-one')
                .query(encrypt({id: entryID}));
            expect(res).to.have.status(200);
            var decrypted = decrypt(res.text);
            expect(decrypted).to.have.property('result');
            expect(decrypted.result).to.equal(1);

            verifyItem(decrypted.item);
            // Is this test necessary ?
            // It makes the whole test sequence longer, and doesn't really change much
        });
    });

    describe('/api/data-sources/create', function () {
    // TODO : preliminary tests where the post is expected to fail
    // TODO : creating a post as an unauthentified user ?

        it('should create an entry made by an authenticated user', async function () {
            await authentifyAgent(agent);

            var res = await agent.post('/api/data-sources/create')
                .send(encrypt({
                    name: 'non existent db',
                    type: 'MySQL',
                    status: 1,
                    params: [{
                        packetSize: 500,
                        connection: {
                            database: 'database_name',
                            host: 'localhost'
                        }
                    }]
                }));

            const decrypted = decrypt(res.text);

            expect(decrypted).to.have.property('result');
            expect(decrypted.result).to.equal(1);
            expect(decrypted).to.have.property('item');
            verifyItem(decrypted.item);

            expect(decrypted.item.params[0].connection.database)
                .to.equal('database_name');

            await DataSources.deleteOne({_id: decrypted.item._id});
        });
    });

    describe('/api/data-sources/upload-config-file', function () {
        it('Should return an error because the file is undefined', async function () {
            await authentifyAgent(agent);

            var res = await agent.post('/api/data-sources/upload-config-file');
            expect(res).to.have.status(500);
        });

        it('should upload the file successfully', async function () {
            // TODO : fill this after figuring out what a config file is
        });
    });

    describe('/api/data-sources/update', function () {
        it('should modify a database entry successfully', async function () {
            await authentifyAgent(agent);

            var res = await agent.get('/api/data-sources/find-all');
            const entryID = decrypt(res.text).items[0]._id;

            res = await agent.post('/api/data-sources/update/' + String(entryID))
                .send(encrypt({
                    _id: entryID,
                    name: 'renamed dummy db',
                    type: 'MySQL',
                    params: [{
                        connection: {
                            database: 'modified_name'
                        }
                    }]
                }));
            expect(res).to.have.status(200);

            var decrypted = decrypt(res.text);
            expect(decrypted).to.have.property('result');
            expect(decrypted.result).to.equal(1);

            res = await agent.get('/api/data-sources/find-one')
                .query(encrypt({id: entryID}));
            expect(res).to.have.status(200);
            decrypted = decrypt(res.text);
            verifyItem(decrypted.item);

            expect(decrypted.item.name).to.equal('renamed dummy db');
            expect(decrypted.item.type).to.equal('MySQL');
            expect(decrypted.item.params[0].connection.database)
                .to.equal('modified_name');
        });
    });

});
