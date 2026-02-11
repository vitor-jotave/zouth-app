<?php

namespace App\Enums;

enum UserType: string
{
    case Superadmin = 'superadmin';
    case ManufacturerUser = 'manufacturer_user';
    case SalesRep = 'sales_rep';
}
