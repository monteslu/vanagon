var dojoConfig = {
  baseUrl: './',
  packages: [
    {
      name: 'dojo',
      location: 'deps/dojo'
    },
    {
      name: 'dcl',
      location: 'deps/dcl',
      main: 'dcl'
    },
    {
      name: 'frozen',
      location: 'deps/frozen/src',
      main: 'GameCore'
    },
    {
      name: 'game',
      location: 'src',
      main: 'game'
    },
    {
      name: 'qrcode',
      location: 'qrCode'
    }
  ],
  deps: ['game'],
  async: true
};