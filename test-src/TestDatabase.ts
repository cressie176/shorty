import Database from '../src/infra/Database.js';

export default class TestDatabase extends Database {
  async nuke(): Promise<void> {
    await this.withClient((client) => client.query('SELECT nuke_data()'));
  }
}
