# Miraheze Bot

https://ngnlzh.miraheze.org/wiki/User:SILI_bot

## Automatic Tasks

### Daily

- KeepAlive: Keep wiki alive by editing a page every day

### Weekly

\-

### Monthly

\-

## Maunual Tasks

### batch-download

`pnpm task:batch-download`

Dump all files from NGNL Fandom wiki

### batch-upload

`pnpm task:batch-upload`

Upload all files from [upload](src/plugins/files-manager/upload/) directory to NGNL Miraheze wiki

**continue from**

`pnpm task:batch-upload Example.png`

This will upload all files after `Example.png`. This is useful when the upload process is interrupted.
