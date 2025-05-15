export enum DocumentParseRunningStatus {
  IDLE = '0', // need to run
  RUNNING = '1', // need to cancel
  CANCEL = '2', // need to refresh
  DONE = '3', // need to refresh
  FAIL = '4' // need to refresh
}

export enum DocumentParserType {
  General = 'general', //自动解析
  Naive = 'naive',
  Qa = 'qa',
  Manual = 'manual',
  Table = 'table',
  Paper = 'paper',
  Book = 'book',
  Laws = 'laws',
  Picture = 'picture',
  One = 'one',
  Audio = 'audio',
  Email = 'email',
  Tag = 'tag'
}
