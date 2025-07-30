# Guide pour créer une PWA avec Bubblewrap

Ce guide vous explique comment transformer votre application web KundaPay en une application Android installable en utilisant Bubblewrap.

## Prérequis

1. Node.js 14 ou supérieur
2. JDK 11 ou supérieur
3. Android SDK
4. Bubblewrap CLI

## Installation de Bubblewrap

```bash
npm install -g @bubblewrap/cli
```

## Étapes pour créer une PWA

1. Assurez-vous que votre site web a un manifeste valide (`manifest.json`)

2. Initialisez votre projet Bubblewrap

```bash
npm run bubblewrap:init
```

3. Construisez l'APK

```bash
npm run bubblewrap:build
```

4. L'APK sera généré dans le dossier `./app-release-signed.apk`

## Personnalisation

Vous pouvez personnaliser votre application en modifiant le fichier `bubblewrap-config.json` qui sera créé après l'initialisation.

## Publication sur Google Play Store

1. Créez un compte développeur sur Google Play Console
2. Créez une nouvelle application
3. Téléchargez l'APK signé
4. Remplissez les informations requises (captures d'écran, description, etc.)
5. Publiez votre application

## Ressources utiles

- [Documentation officielle de Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap)
- [Guide de PWA sur web.dev](https://web.dev/progressive-web-apps/)