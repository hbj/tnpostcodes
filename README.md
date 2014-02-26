# TNPostCodes

TNPostCodes est une collection de fonctions qui permettent de lire les listes des gouvernorats, délégations, localités
et code postaux à partir du site de la poste Tunisienne.

## Fonctionnement

Les fonctions utilisent les données HTML telles qu'elles sont utilisées sur la page
'[Recherche du code postal](http://www.poste.tn/codes.php)' de La Poste Tunisienne. Des requêtes POST sont effectuées
pour lire les données recherchées, le résultat reçu, qui est un code HTML, est scanné et les données y sont extraites.

## Fichier des codes postaux

Le fichier `codes.csv` contient la liste des codes postaux existants à la date de sa création. Il est généré avec
l'outil `export.js`. Vous n'avez qu'a télécharger ce fichier si vous avez juste besoin de cette liste. La librairie
devient utile si vous voulez utiliser les données d'une façon spécifique.

## Installation

Soit à partir de [GitHub](https://github.com/hbj/tnpostcodes) soit en utilisant npm:

```
npm install tnpostcodes
```
