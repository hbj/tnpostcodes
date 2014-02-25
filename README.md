# TNPostCodes

TNPostCodes est une collection de fonctions qui permettent de retirer les listes des villes, délégations, localités
et code postaux à partir du site de la poste Tunisienne.

## Fonctionnement

Les fonctions utilisent les données HTML tels qu'elles sont utilisées sur la page de
['Recherche du code postal' de La Poste Tunisenne](http://www.poste.tn/codes.php). Des requêtes POST sont effectuées pour
lire les données recherchées et le résultat reçu, qui est un code HTML, est scanné et les données y sont extraites.
