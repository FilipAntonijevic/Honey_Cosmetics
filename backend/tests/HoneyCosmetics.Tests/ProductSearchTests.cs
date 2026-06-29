using HoneyCosmetics.Application;

namespace HoneyCosmetics.Tests;

public class ProductSearchTests
{
    [Theory]
    [InlineData("Gel Lak Ruby", "gel", true)]
    [InlineData("Gel Lak Ruby", "gel lak", true)]
    [InlineData("Gel Lak Ruby", "ruby gel", true)]
    [InlineData("Gel Lak Ruby", "lak rub", true)]
    [InlineData("Gel Lak Ruby", "baza", false)]
    [InlineData("Rubber Cover 15ml", "rubber 15", true)]
    [InlineData("Makazice za zanoktice", "makazice zanokt", true)]
    [InlineData("Makazice za zanoktice", "Makaziče", true)]
    [InlineData("Builder Gel", "builder", true)]
    public void MatchesName_token_and_diacritic_insensitive(string name, string query, bool expected)
    {
        Assert.Equal(expected, ProductSearch.MatchesName(name, query));
    }
}
